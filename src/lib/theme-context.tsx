import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    // Check if we're in embedded mode - force light mode for embedded views
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('embed') === 'true') {
      return 'light'
    }
    
    // Check localStorage first
    const savedTheme = localStorage.getItem('theme') as Theme
    if (savedTheme) return savedTheme
    
    // Check system preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark'
    }
    return 'light'
  })

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.add('light')
    }
    // Only save to localStorage if not in embed mode (to avoid conflicts)
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('embed') !== 'true') {
      localStorage.setItem('theme', theme)
    }
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}

