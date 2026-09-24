import { requireUser } from "@/server/auth/session";
import { signOutAction } from "@/server/actions/account";
import { Button } from "@/components/ui/button";

// Temporary minimal shell: session guard + a way to sign out for testing.
// Replaced by the real nav shell in the next milestone.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <span className="font-semibold tracking-tight text-primary">Board</span>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{user.email}</span>
          <form action={signOutAction}>
            <Button type="submit" variant="outline" size="sm">
              Se déconnecter
            </Button>
          </form>
        </div>
      </header>
      <main className="flex-1 px-6 py-6">{children}</main>
    </div>
  );
}
