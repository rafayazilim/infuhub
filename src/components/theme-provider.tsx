import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from "react"

/** Uygulama yalnızca koyu temaya sabitliyor; açık/sistem seçeneği yok. */
export type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: "dark"
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: "dark",
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

function applyForcedDark(storageKey: string) {
  const root = window.document.documentElement
  root.classList.remove("light", "dark")
  root.classList.add("dark")
  root.dataset.theme = "dark"
  try {
    localStorage.setItem(storageKey, "dark")
  } catch {
    /* ignore */
  }
}

export function ThemeProvider({
  children,
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  useEffect(() => {
    applyForcedDark(storageKey)
  }, [storageKey])

  const setTheme = useCallback(
    (_theme: Theme) => {
      applyForcedDark(storageKey)
    },
    [storageKey]
  )

  const value = useMemo(
    () => ({
      theme: "dark" as const,
      setTheme,
    }),
    [setTheme]
  )

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}
