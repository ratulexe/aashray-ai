import {
  ArrowRight,
  BedDouble,
  Building2,
  MapPinned,
  Radio,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'

const roles = [
  {
    title: 'Citizen',
    path: '/citizen',
    icon: Users,
    text: 'Find verified shelters, request help, and share your current needs.',
    meta: 'Open citizen access',
  },
  {
    title: 'Authority',
    path: '/authority',
    icon: ShieldCheck,
    text: 'Track city-wide demand, incident signals, and priority response lanes.',
    meta: 'Command overview',
  },
  {
    title: 'Shelter Operator',
    path: '/shelter',
    icon: Building2,
    text: 'Update capacity, accept referrals, and coordinate essentials in real time.',
    meta: 'Shelter workspace',
  },
]

const metrics = [
  ['128', 'active shelter beds'],
  ['42 min', 'average placement time'],
  ['19', 'field requests monitored'],
]

function Landing() {
  return (
    <main className="page landing-page">
      <nav className="topbar" aria-label="Primary navigation">
        <Link className="brand" to="/">
          <span className="brand-mark">A</span>
          <span>Aashray AI</span>
        </Link>
        <div className="nav-links">
          <Link to="/citizen">Citizen</Link>
          <Link to="/authority">Authority</Link>
          <Link to="/shelter">Shelter</Link>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="hero-copy">
          <p className="eyebrow">Coordinated shelter access</p>
          <h1>Aashray AI</h1>
          <p className="hero-text">
            A role-based emergency shelter network that connects people seeking
            safe accommodation with civic teams and verified shelter operators.
          </p>
          <div className="hero-actions" aria-label="Choose your workspace">
            {roles.map((role) => (
              <Link className="primary-action" key={role.path} to={role.path}>
                <role.icon size={20} aria-hidden="true" />
                <span>{role.title}</span>
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            ))}
          </div>
        </div>

        <div className="signal-panel" aria-label="Live coordination snapshot">
          <div className="map-card">
            <div className="map-grid" />
            <span className="map-pin pin-one">
              <MapPinned size={18} aria-hidden="true" />
            </span>
            <span className="map-pin pin-two">
              <BedDouble size={18} aria-hidden="true" />
            </span>
            <span className="map-pin pin-three">
              <Radio size={18} aria-hidden="true" />
            </span>
          </div>
          <div className="signal-list">
            {metrics.map(([value, label]) => (
              <div className="signal-item" key={label}>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="role-grid" aria-label="Aashray AI workspaces">
        {roles.map((role) => (
          <Link className="role-card" key={role.path} to={role.path}>
            <span className="card-icon">
              <role.icon size={24} aria-hidden="true" />
            </span>
            <span className="role-meta">{role.meta}</span>
            <h2>{role.title}</h2>
            <p>{role.text}</p>
            <span className="card-link">
              Open page <ArrowRight size={17} aria-hidden="true" />
            </span>
          </Link>
        ))}
      </section>
    </main>
  )
}

export default Landing
