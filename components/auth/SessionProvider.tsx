import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { AppState } from "react-native";
import { flushDeviceLogout, getStoredUser, onSessionChange, restoreSession, type ApiUser } from "../../app/lib/api";

const SessionContext = createContext<{ ready: boolean; user: ApiUser | null }>({ ready: false, user: null });

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<{ ready: boolean; user: ApiUser | null }>({ ready: false, user: null });

  useEffect(() => {
    let active = true;
    let changed = false;
    const unsubscribe = onSessionChange(user => {
      changed = true;
      if (active) setSession({ ready: true, user });
    });
    // Read the saved identity immediately. Validate/renew asynchronously so a
    // sleeping Render instance does not hold the app on its splash screen.
    void getStoredUser().then(user => {
      if (active && !changed) setSession({ ready: true, user });
    }).catch(() => {
      if (active && !changed) setSession({ ready: true, user: null });
    });
    const refresh = () => {
      void flushDeviceLogout().catch(() => {});
      void restoreSession().catch(() => {});
    };
    refresh();
    const foreground = AppState.addEventListener("change", state => {
      if (state === "active") refresh();
    });
    return () => {
      active = false;
      unsubscribe();
      foreground.remove();
    };
  }, []);

  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}

export const useSession = () => useContext(SessionContext);
