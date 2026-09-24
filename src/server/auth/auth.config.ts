import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Plan } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { loginSchema } from "@/lib/validation/auth";
import { verifyPassword } from "./password";
import { checkRateLimit } from "./rate-limit";

// Precomputed bcrypt hash of an arbitrary, unused value. Compared against
// on every login attempt for an email that doesn't exist, so that path
// costs the same ~O(bcrypt) time as a real "wrong password" rejection —
// without it, a nonexistent-email login returns near-instantly while a
// wrong-password one takes bcrypt's compare time, and that gap is a
// textbook timing side-channel an attacker can use to enumerate which
// emails have an account.
const DECOY_PASSWORD_HASH = "$2b$12$KqM3L9yE6hqrSlnwjxoZ9..r4TtncZpcVIDMWUOi21HoCUPaGF53i";

declare module "next-auth" {
  interface Session {
    // Narrower than the library's default (which types email/name as
    // optional, to fit providers that may not return one): this app is
    // Credentials-only and always sets both at registration, so callers
    // shouldn't have to null-check an email that's structurally guaranteed.
    user: {
      id: string;
      plan: Plan;
      name: string | null;
      email: string;
      image: string | null;
    };
  }
  interface User {
    plan: Plan;
  }
}

// next-auth/jwt is a pure re-export barrel (`export * from "@auth/core/jwt"`)
// with nothing declared in the module itself, so TS won't resolve a
// `declare module "next-auth/jwt"` augmentation against it — the actual
// `JWT` interface lives in, and must be augmented via, @auth/core/jwt.
declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    plan: Plan;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  // Required for Auth.js to accept requests through this environment's
  // reverse proxy (and most non-Vercel hosts) instead of rejecting them as
  // an untrusted Host header. This is safe specifically because NEXTAUTH_URL
  // is always set (see .env.example) — Auth.js prefers that fixed, trusted
  // URL for the callback/redirect URLs it constructs, so trustHost mainly
  // affects host-header *validation*, not which URL gets used. Before a
  // production deploy: confirm the chosen host actually terminates TLS and
  // sets Host itself (Vercel, Fly, a properly configured reverse proxy all
  // qualify) — trustHost is unsafe only behind a proxy that forwards an
  // untrusted client-supplied Host header as-is.
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      authorize: async (raw) => {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        // Keyed by email, not IP: this app sits behind an unknown/possibly
        // proxying host, so the client IP isn't reliably available here,
        // and per-account limiting is what actually matters for a
        // credential-guessing attack against one target — an attacker
        // spraying one password across many emails is throttled by each
        // target account's own bucket just the same.
        const { allowed } = checkRateLimit(`login:${email}`, {
          max: 10,
          windowMs: 5 * 60 * 1000,
        });
        if (!allowed) return null;

        const user = await prisma.user.findUnique({ where: { email } });

        // Always run a bcrypt compare, real hash or decoy, so this
        // function takes the same time whether or not the email exists —
        // see DECOY_PASSWORD_HASH above.
        const valid = await verifyPassword(password, user?.passwordHash ?? DECOY_PASSWORD_HASH);
        if (!user?.passwordHash || !valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          plan: user.plan,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.plan = (user as { plan: Plan }).plan;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.plan = token.plan;
      return session;
    },
  },
});
