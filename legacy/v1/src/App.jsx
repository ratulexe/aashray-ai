import { Suspense, lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import { ThemeProvider } from './components/AppHeader.jsx'
import './styles/ui.css'

import Authority from './pages/Authority.jsx'
import Citizen from './pages/Citizen.jsx'
import Landing from './pages/Landing.jsx'
import Shelter from './pages/Shelter.jsx'

const SeedShelters = import.meta.env.DEV
  ? lazy(() => import('./dev/SeedShelters.jsx'))
  : null

function App() {
  return (
    <ThemeProvider>
      <div className="app-shell">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/citizen" element={<Citizen />} />
          <Route path="/authority" element={<Authority />} />
          <Route path="/shelter" element={<Shelter />} />
          {SeedShelters && (
            <Route
              path="/dev/seed"
              element={
                <Suspense fallback={null}>
                  <SeedShelters />
                </Suspense>
              }
            />
          )}
        </Routes>
      </div>
    </ThemeProvider>
  )
}

export default App
