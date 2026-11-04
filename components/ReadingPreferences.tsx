import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { getStoredUser, type ReadingPreferences } from "../app/lib/api";

export const defaultReadingPreferences: ReadingPreferences = { textSize: "standard", followReading: true };
const sizes = { small: { fontSize: 18, lineHeight: 28 }, standard: { fontSize: 20, lineHeight: 32 }, large: { fontSize: 24, lineHeight: 38 } };
const Context = createContext({ preferences: defaultReadingPreferences, textStyle: sizes.standard,
  setPreferences: (_value: ReadingPreferences) => {}, refresh: async () => {} });
export function ReadingPreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(defaultReadingPreferences);
  const refresh = useCallback(async () => {
    try {
      const user = await getStoredUser();
      const saved = user?.readingPreferences;
      setPreferences(saved && saved.textSize in sizes ? saved : defaultReadingPreferences);
    } catch { setPreferences(defaultReadingPreferences); }
  }, []);
  const value = useMemo(() => ({ preferences, textStyle: sizes[preferences.textSize], setPreferences, refresh }), [preferences, refresh]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useReadingPreferences() { return useContext(Context); }
