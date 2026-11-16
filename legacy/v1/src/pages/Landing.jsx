import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  MapPin,
  Navigation,
  Radio,
  Route,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader.jsx'

const roleCards = [
  {
    title: 'Citizen',
    path: '/citizen',
    icon: Users,
    description: 'Find a suitable shelter, reserve space for your family, and receive a verifiable evacuation code.',
    action: 'Start citizen flow',
    steps: ['Share family needs', 'Review a safe shelter match', 'Reserve spaces'],
  },
  {
    title: 'Shelter Operator',
    path: '/shelter',
    icon: Building2,
    description: 'Verify incoming reservations, confirm arrivals, and keep capacity information current.',
    action: 'Open operator dashboard',
    steps: ['View live capacity', 'Verify an ASH code', 'Confirm safe arrival'],
  },
  {
    title: 'Authority',
    path: '/authority',
    icon: ShieldCheck,
    description: 'Monitor evacuation demand and shelter readiness across affected areas from one clear view.',
    action: 'View authority dashboard',
    steps: ['Assess active incidents', 'Track zone capacity', 'Prioritize support'],
  },
]

const responseSteps = [
  ['01', 'Understand the need', 'Capture family size and accessibility requirements.'],
  ['02', 'Find a suitable shelter', 'Compare safety, capacity, distance, and route access.'],
  ['03', 'Reserve and verify', 'Issue a unique ASH code for shelter check-in.'],
  ['04', 'Confirm arrival', 'Update shelter occupancy once the family arrives.'],
]

export default function Landing() {
  return (
    <main className="landing-page">
      <AppHeader />

      <section className="page-container landing-hero" aria-labelledby="landing-heading">
        <div className="landing-hero-copy">
          <p className="eyebrow-label">Coordinated shelter access</p>
          <h1 id="landing-heading">
            A clear route to safety.
            <span>When every minute matters.</span>
          </h1>
          <p>
            Aashray AI connects families with suitable shelters using current
            capacity, accessibility, and route information—then helps response
            teams coordinate each safe arrival.
          </p>

          <div className="landing-actions">
            <Link className="button-primary" to="/citizen">
              <Navigation size={19} aria-hidden="true" />
              Find a safe shelter
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link className="button-secondary" to="/shelter">
              <Building2 size={18} aria-hidden="true" />
              Shelter operator
            </Link>
          </div>

          <div className="landing-trust" aria-label="Platform safeguards">
            <span><CheckCircle2 size={16} aria-hidden="true" /> Verifiable reservation workflow</span>
            <span><CheckCircle2 size={16} aria-hidden="true" /> Accessibility-aware placement</span>
          </div>
        </div>

        <article className="surface-card hero-safety-card" aria-label="How Aashray AI coordinates a safe route">
          <div className="hero-safety-top">
            <span className="hero-safety-icon"><Route size={25} aria-hidden="true" /></span>
            <span className="status-badge success"><Radio size={13} aria-hidden="true" /> System ready</span>
          </div>
          <h2>From location to confirmed shelter</h2>
          <p>Critical details stay visible throughout the evacuation journey.</p>
          <div className="hero-route" aria-hidden="true">
            <span className="route-point start"><MapPin size={17} /></span>
            <span className="hero-route-label start">Family location</span>
            <span className="route-point end"><ShieldCheck size={17} /></span>
            <span className="hero-route-label end">Verified shelter</span>
          </div>
          <div className="hero-safety-footer">
            <div><strong>Live</strong><span>capacity signals</span></div>
            <div><strong>ASH</strong><span>reservation code</span></div>
            <div><strong>3 roles</strong><span>one response flow</span></div>
          </div>
        </article>
      </section>

      <section className="page-container landing-section" aria-labelledby="roles-heading">
        <div className="section-heading">
          <p className="eyebrow-label">One response network</p>
          <h2 id="roles-heading">A focused workspace for every role</h2>
          <p>Each screen prioritizes the next decision without hiding the context people need under pressure.</p>
        </div>
        <div className="role-grid">
          {roleCards.map(({ title, path, icon: Icon, description, action, steps }) => (
            <article className="surface-card role-option" key={path}>
              <span className="role-option-icon"><Icon size={23} aria-hidden="true" /></span>
              <h3>{title}</h3>
              <p>{description}</p>
              <ul>
                {steps.map((step) => <li key={step}><CheckCircle2 size={15} aria-hidden="true" />{step}</li>)}
              </ul>
              <Link className="button-secondary" to={path}>{action}<ArrowRight size={17} aria-hidden="true" /></Link>
            </article>
          ))}
        </div>
      </section>

      <section className="page-container landing-section" aria-labelledby="workflow-heading">
        <div className="section-heading">
          <p className="eyebrow-label">Alert to arrival</p>
          <h2 id="workflow-heading">A simple, traceable evacuation flow</h2>
        </div>
        <div className="workflow-grid">
          {responseSteps.map(([number, title, description]) => (
            <article className="surface-card workflow-step" key={number}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="page-container app-footer">
        <span>Aashray AI · Disaster evacuation and shelter coordination</span>
        <span><ClipboardCheck size={14} aria-hidden="true" /> Prototype demonstration</span>
      </footer>
    </main>
  )
}
