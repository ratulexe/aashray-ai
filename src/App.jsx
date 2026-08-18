import { Route, Routes } from 'react-router-dom'
import './App.css'

import Authority from './pages/Authority.jsx'
import Citizen from './pages/Citizen.jsx'
import Landing from './pages/Landing.jsx'
import Shelter from './pages/Shelter.jsx'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/citizen" element={<Citizen />} />
      <Route path="/authority" element={<Authority />} />
      <Route path="/shelter" element={<Shelter />} />
    </Routes>
  )
}

export default App
