import {
  ArrowLeft,
  BedDouble,
  Bell,
  CheckCircle2,
  HeartPulse,
  MapPin,
  Phone,
  Route,
} from 'lucide-react'
import { Link } from 'react-router-dom'

const shelters = [
  {
    name: 'Central Relief Shelter',
    distance: '1.4 km',
    beds: '18 beds',
    fit: 'Families and medical support',
  },
  {
    name: 'Nagar Community Hall',
    distance: '2.1 km',
    beds: '31 beds',
    fit: 'Women, children, and meals',
  },
  {
    name: 'Transit Night Center',
    distance: '3.7 km',
    beds: '12 beds',
    fit: 'Short stay and document help',
  },
]

function Citizen() {
  return (
    <main className="page role-page citizen-theme">
      <RoleNav current="Citizen" />

      <section className="role-hero">
        <div>
          <p className="eyebrow">Citizen page</p>
          <h1>Find safe shelter fast</h1>
          <p>
            Search nearby verified shelters, request placement support, and
            keep trusted responders updated with your status.
          </p>
        </div>
        <div className="status-card urgent">
          <Bell size={22} aria-hidden="true" />
          <span>Current request</span>
          <strong>Help needed near Sector 7</strong>
          <small>Priority matched to 3 shelters</small>
        </div>
      </section>

      <section className="workspace-grid">
        <div className="tool-panel wide">
          <div className="section-heading">
            <h2>Nearby options</h2>
            <span>Live availability</span>
          </div>
          <div className="shelter-list">
            {shelters.map((shelter) => (
              <article className="shelter-row" key={shelter.name}>
                <span className="row-icon">
                  <BedDouble size={20} aria-hidden="true" />
                </span>
                <div>
                  <h3>{shelter.name}</h3>
                  <p>{shelter.fit}</p>
                </div>
                <div className="row-meta">
                  <strong>{shelter.beds}</strong>
                  <span>{shelter.distance}</span>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="tool-panel">
          <div className="section-heading">
            <h2>Request support</h2>
          </div>
          <div className="quick-actions">
            <button type="button">
              <MapPin size={19} aria-hidden="true" />
              Share location
            </button>
            <button type="button">
              <HeartPulse size={19} aria-hidden="true" />
              Add needs
            </button>
            <button type="button">
              <Phone size={19} aria-hidden="true" />
              Call helpline
            </button>
          </div>
        </div>

        <div className="tool-panel">
          <div className="section-heading">
            <h2>Journey</h2>
          </div>
          <ol className="timeline">
            <li>
              <CheckCircle2 size={18} aria-hidden="true" />
              Request received
            </li>
            <li>
              <Route size={18} aria-hidden="true" />
              Shelter match in progress
            </li>
            <li>
              <BedDouble size={18} aria-hidden="true" />
              Bed confirmation pending
            </li>
          </ol>
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

export default Citizen
