import {
  Activity,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock3,
  Radio,
  ShieldCheck,
  Siren,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'

const incidents = [
  ['Flooding near Yamuna Bazar', 'High', '68 citizens affected'],
  ['Night shelter overflow', 'Medium', '22 referrals waiting'],
  ['Medical assistance cluster', 'High', '9 urgent cases'],
]

const zones = [
  ['North Zone', '86%', '142 beds occupied'],
  ['Central Zone', '71%', '88 beds occupied'],
  ['East Zone', '64%', '73 beds occupied'],
]

function Authority() {
  return (
    <main className="page role-page authority-theme">
      <RoleNav current="Authority" />

      <section className="role-hero">
        <div>
          <p className="eyebrow">Authority page</p>
          <h1>Coordinate response across the city</h1>
          <p>
            See demand patterns, prioritize incidents, and dispatch support to
            shelters before capacity pressure becomes a crisis.
          </p>
        </div>
        <div className="status-card">
          <ShieldCheck size={22} aria-hidden="true" />
          <span>City readiness</span>
          <strong>Stable with 3 watch zones</strong>
          <small>Updated from active shelter feeds</small>
        </div>
      </section>

      <section className="stats-strip" aria-label="Authority metrics">
        <div>
          <Users size={21} aria-hidden="true" />
          <strong>312</strong>
          <span>people placed today</span>
        </div>
        <div>
          <Building2 size={21} aria-hidden="true" />
          <strong>41</strong>
          <span>shelters reporting</span>
        </div>
        <div>
          <Clock3 size={21} aria-hidden="true" />
          <strong>16 min</strong>
          <span>median dispatch time</span>
        </div>
      </section>

      <section className="workspace-grid">
        <div className="tool-panel wide">
          <div className="section-heading">
            <h2>Priority incidents</h2>
            <span>Response queue</span>
          </div>
          <div className="incident-list">
            {incidents.map(([title, priority, detail]) => (
              <article className="incident-row" key={title}>
                <span className="row-icon">
                  <Siren size={20} aria-hidden="true" />
                </span>
                <div>
                  <h3>{title}</h3>
                  <p>{detail}</p>
                </div>
                <strong className={`priority ${priority.toLowerCase()}`}>
                  {priority}
                </strong>
              </article>
            ))}
          </div>
        </div>

        <div className="tool-panel">
          <div className="section-heading">
            <h2>Zone capacity</h2>
          </div>
          <div className="capacity-list">
            {zones.map(([zone, percent, detail]) => (
              <div className="capacity-row" key={zone}>
                <div>
                  <strong>{zone}</strong>
                  <span>{detail}</span>
                </div>
                <span>{percent}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="tool-panel">
          <div className="section-heading">
            <h2>Actions</h2>
          </div>
          <div className="quick-actions">
            <button type="button">
              <Radio size={19} aria-hidden="true" />
              Dispatch team
            </button>
            <button type="button">
              <Activity size={19} aria-hidden="true" />
              Open live map
            </button>
            <button type="button">
              <CheckCircle2 size={19} aria-hidden="true" />
              Publish advisory
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}

function RoleNav({ current }) {
  return (
    <nav className="topbar" aria-label="Role navigation">
      <Link className="brand" to="/">
        <span className="brand-mark">A</span>
        <span>Aashray AI</span>
      </Link>
      <div className="nav-links">
        <Link to="/">
          <ArrowLeft size={16} aria-hidden="true" />
          Home
        </Link>
        <span>{current}</span>
      </div>
    </nav>
  )
}

export default Authority
