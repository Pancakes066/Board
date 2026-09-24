import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Plan } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { loginSchema } from "@/lib/validation/auth";
import { verifyPassword } from "./password";

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

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) return null;

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
