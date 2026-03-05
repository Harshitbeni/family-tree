import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('family-tree-theme') || 'neutral'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme === 'got' ? 'got' : '')
    localStorage.setItem('family-tree-theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'neutral' ? 'got' : 'neutral')

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
