import { useEffect } from "react";
import { AppState } from "react-native";
import { useSession } from "./auth/SessionProvider";
import { syncNotifications } from "./notifications";
import { onReminderDataChange } from "../app/lib/api";

export function NotificationSync() {
  const { ready, user } = useSession();

  useEffect(() => {
    if (!ready) return;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const sync = (prompt = false) => {
      void syncNotifications(user, prompt).catch(error => {
        console.warn("Could not sync classroom reminders:", error.message);
      });
    };
    sync(true);

    const foreground = AppState.addEventListener("change", state => {
      if (state === "active") sync();
    });
    const unsubscribe = onReminderDataChange(() => {
      clearTimeout(timeout);
      timeout = setTimeout(sync, 250);
    });
    // Refresh classroom data while the app stays open.
    const interval = setInterval(() => {
      if (AppState.currentState === "active" && user) sync();
    }, 60_000);
    return () => {
      foreground.remove();
      unsubscribe();
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [ready, user]);

  return null;
}
