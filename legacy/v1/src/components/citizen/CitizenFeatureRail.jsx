import { BellRing, DatabaseZap, MapPinned, Route } from 'lucide-react'

const features = [
  { icon: MapPinned, lead: 'Locate', text: 'Safe Shelters' },
  { icon: DatabaseZap, lead: 'Real-time', text: 'Capacity Updates' },
  { icon: Route, lead: 'AI-Powered', text: 'Safe Routes' },
  { icon: BellRing, lead: 'Timely', text: 'Emergency Alerts' },
]

function CitizenFeatureRail() {
  return (
    <section className="citizen-feature-rail" aria-label="Aashray AI capabilities">
      {features.map(({ icon: Icon, lead, text }) => (
        <article key={text}>
          <span className="citizen-feature-icon">
            <Icon size={19} aria-hidden="true" />
          </span>
          <p>
            <span>{lead}</span>
            <strong>{text}</strong>
          </p>
        </article>
      ))}
    </section>
  )
}

export default CitizenFeatureRail
