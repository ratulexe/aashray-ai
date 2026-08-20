import { BatteryCharging, MapPin, Radio, Route } from 'lucide-react'

export default function CycloneTrackingPanel({ disaster }) {
  return (
    <aside className="surface-card guidance-card" aria-labelledby="emergency-guidance-heading">
      <p className="eyebrow-label">Emergency guidance</p>
      <h2 id="emergency-guidance-heading">Prepare to leave safely</h2>
      <p>Stay calm, keep essential items together, and follow official instructions.</p>
      <ul className="guidance-list">
        <li><MapPin size={17} aria-hidden="true" /><span>Your affected area is <strong>{disaster.affectedArea}</strong>.</span></li>
        <li><Route size={17} aria-hidden="true" /><span>Use the recommended route and avoid unverified shortcuts.</span></li>
        <li><BatteryCharging size={17} aria-hidden="true" /><span>Keep your phone charged and carry essential medication.</span></li>
        <li><Radio size={17} aria-hidden="true" /><span>Monitor official alerts for changing conditions.</span></li>
      </ul>
    </aside>
  )
}
