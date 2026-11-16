import { Building2, MapPin } from 'lucide-react'

export default function ShelterHeader({ shelter }) {
  const intakeActive = shelter.status === 'AVAILABLE'

  return (
    <header className="operator-hero">
      <div className="page-container operator-hero-inner">
        <div className="operator-identity">
          <span className="operator-icon"><Building2 size={26} aria-hidden="true" /></span>
          <div>
            <p className="eyebrow-label">Shelter {shelter.id} · Operator dashboard</p>
            <h1>{shelter.name}</h1>
            <p><MapPin size={16} aria-hidden="true" />{shelter.location}</p>
          </div>
        </div>
        <span className={`status-badge ${intakeActive ? 'success' : 'warning'}`}>
          <span aria-hidden="true">●</span>
          {intakeActive ? 'Intake active' : 'Intake unavailable'}
        </span>
      </div>
    </header>
  )
}
