import { Building2, Clock3, Info, Siren, Users } from 'lucide-react'
import { AppHeader } from '../components/AppHeader.jsx'

const incidents = [
  ['Flooding near Yamuna Bazar', 'High', '68 citizens affected'],
  ['Night shelter overflow', 'Medium', '22 referrals waiting'],
  ['Medical assistance cluster', 'High', '9 urgent cases'],
]

const zones = [
  ['North Zone', 86, '142 beds occupied'],
  ['Central Zone', 71, '88 beds occupied'],
  ['East Zone', 64, '73 beds occupied'],
]

const metrics = [
  [Users, '312', 'people placed today'],
  [Building2, '41', 'shelters reporting'],
  [Clock3, '16 min', 'median dispatch time'],
  [Siren, '3', 'priority incidents'],
]

export default function Authority() {
  return (
    <main>
      <AppHeader />
      <div className="page-container authority-page">
        <section className="authority-title-row" aria-labelledby="authority-heading">
          <div>
            <p className="eyebrow-label">Authority coordination</p>
            <h1 id="authority-heading">City response overview</h1>
            <p>Prioritize incidents, monitor shelter pressure, and coordinate support across affected zones.</p>
          </div>
          <div className="authority-alert">
            <Siren size={23} aria-hidden="true" />
            <div>
              <small>Active emergency · High severity</small>
              <strong>3 priority incidents</strong>
              <span>3 reported locations</span>
            </div>
          </div>
        </section>

        <section className="authority-stats" aria-label="Authority metrics">
          {metrics.map(([Icon, value, label]) => (
            <article className="surface-card authority-stat" key={label}>
              <Icon size={21} aria-hidden="true" />
              <strong>{value}</strong>
              <span>{label}</span>
            </article>
          ))}
        </section>

        <section className="authority-grid">
          <article className="surface-card authority-card">
            <div className="operator-card-heading">
              <div><p className="operator-section-label">Response queue</p><h2>Priority incidents</h2></div>
              <span className="status-badge danger">Action needed</span>
            </div>
            <div className="incident-list">
              {incidents.map(([title, priority, detail]) => (
                <div className="incident-item" key={title}>
                  <span className="incident-item-icon"><Siren size={19} aria-hidden="true" /></span>
                  <div><h3>{title}</h3><p>{detail}</p></div>
                  <span className={`status-badge ${priority === 'High' ? 'danger' : 'warning'}`}>{priority}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="surface-card authority-card">
            <div className="operator-card-heading"><div><p className="operator-section-label">Live availability</p><h2>Zone capacity</h2></div></div>
            <div className="zone-list">
              {zones.map(([zone, percent, detail]) => (
                <div className="zone-item" key={zone}>
                  <div className="zone-item-top"><div><strong>{zone}</strong><br /><span>{detail}</span></div><strong>{percent}%</strong></div>
                  <div className="zone-progress" aria-label={`${zone} ${percent}% occupied`}><i style={{ width: `${percent}%` }} /></div>
                </div>
              ))}
            </div>
          </article>
        </section>

        <p className="demo-note"><Info size={14} aria-hidden="true" /> Authority metrics are demonstration data for the prototype.</p>
      </div>
    </main>
  )
}
