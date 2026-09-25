"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { listDueRemindersAction } from "@/server/actions/reminders";

const POLL_INTERVAL_MS = 30_000;

/**
 * Honestly-scoped notifications: this only works while the tab is open
 * (in-app toast) or, with the user's explicit browser permission, while
 * the tab is open or backgrounded (Notification API). It never claims to
 * deliver anything with the browser fully closed — that would need a
 * service worker + push infrastructure this app doesn't have, and we'd
 * rather say so than fake it.
 */
export function ReminderNotifier() {
  const lastCheckRef = useRef<string>(new Date().toISOString());
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      const since = lastCheckRef.current;
      const now = new Date().toISOString();
      lastCheckRef.current = now;

      try {
        const due = await listDueRemindersAction(since);
        if (cancelled) return;

        for (const reminder of due) {
          const key = `${reminder.id}:${reminder.occurrence}`;
          if (seenRef.current.has(key)) continue;
          seenRef.current.add(key);

          toast(`🔔 ${reminder.title}`, { description: "C'est l'heure de ce rappel." });

          if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
            new Notification(`🔔 ${reminder.title}`, {
              body: "C'est l'heure de ce rappel — Board",
            });
          }
        }
      } catch {
        // A failed poll just means we retry at the next interval — a
        // reminder never silently disappears because of one network hiccup.
      }
    }

    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return null;
}
