import { redirect } from "next/navigation";

// Auth wiring lands in a later milestone; for now every visitor is sent to
// the login screen. Once session handling exists this becomes a real
// redirect to /dashboard when authenticated.
export default function RootPage() {
  redirect("/login");
}
