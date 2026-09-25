"use client";

import { useState, useSyncExternalStore } from "react";
import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// Notification.permission is a browser-only value with no change event of
// its own — useSyncExternalStore with a no-op subscribe reads it safely
// post-hydration without a server/client mismatch (SSR snapshot always
// "unsupported", since `window` doesn't exist there).
function subscribe() {
  return () => {};
}
function getSnapshot(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}
function getServerSnapshot(): "unsupported" {
  return "unsupported";
}

export function NotificationPermissionBanner() {
  const permission = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  // requestPermission() mutates the read-only Notification.permission global
  // without firing any event — this just forces a re-render so the next
  // getSnapshot() call picks up the new value.
  const [, forceRerender] = useState(0);

  if (permission === "unsupported" || permission === "granted") return null;

  return (
    <Card className="mb-4 border-dashed">
      <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
        <div className="flex items-start gap-2">
          <Bell className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Les rappels s&apos;affichent toujours dans Board quand l&apos;onglet est ouvert. Autorisez
            les notifications de votre navigateur pour être aussi averti·e quand l&apos;onglet est en
            arrière-plan — cela ne fonctionne pas navigateur fermé.
          </p>
        </div>
        {permission === "default" && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => Notification.requestPermission().then(() => forceRerender((n) => n + 1))}
          >
            Autoriser les notifications
          </Button>
        )}
        {permission === "denied" && (
          <span className="text-xs text-muted-foreground">Refusées — modifiable dans les réglages du navigateur.</span>
        )}
      </CardContent>
    </Card>
  );
}
