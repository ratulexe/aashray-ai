import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { Building2, Menu, Moon, ShieldCheck, Sun, Users, X } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'

const ThemeContext = createContext(null)

const navigation = [
  { to: '/citizen', label: 'Citizen', icon: Users },
  { to: '/shelter', label: 'Shelter Operator', icon: Building2 },
  { to: '/authority', label: 'Authority', icon: ShieldCheck },
]

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light'
    return window.localStorage.getItem('aashray-theme') === 'dark'
      ? 'dark'
      : 'light'
  })

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme
    root.classList.toggle('dark', theme === 'dark')
    root.style.colorScheme = theme
    window.localStorage.setItem('aashray-theme', theme)
  }, [theme])

  const value = useMemo(
    () => ({ theme, toggleTheme: () => setTheme((value) => (value === 'light' ? 'dark' : 'light')) }),
    [theme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

function Brand() {
  return (
    <Link className="app-brand" to="/" aria-label="Aashray AI home">
      <span className="app-brand-name">
        <span>Aashray</span>
        <strong>AI</strong>
      </span>
    </Link>
  )
}

function ThemeToggle() {
  const { theme, toggleTheme } = useContext(ThemeContext)
  const isDark = theme === 'dark'

  return (
    <button
      className="theme-toggle"
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      title={`Switch to ${isDark ? 'light' : 'dark'} theme`}
    >
      {isDark ? <Sun size={19} aria-hidden="true" /> : <Moon size={19} aria-hidden="true" />}
    </button>
  )
}

export function AppHeader() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="app-header">
      <nav className="app-header-inner" aria-label="Primary navigation">
        <Brand />

        <div className="app-nav-links">
          {navigation.map(({ to, label }) => (
            <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'active' : undefined)}>
              {label}
            </NavLink>
          ))}
        </div>

        <div className="app-header-actions">
          <ThemeToggle />
          <button
            className="menu-toggle"
            type="button"
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((value) => !value)}
          >
            {menuOpen ? <X size={21} aria-hidden="true" /> : <Menu size={21} aria-hidden="true" />}
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div className="mobile-nav" aria-label="Mobile navigation">
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => (isActive ? 'active' : undefined)}
              onClick={() => setMenuOpen(false)}
            >
              <Icon size={18} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </div>
      )}
    </header>
  )
}

