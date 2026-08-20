import { BedDouble, BookmarkCheck, House, Users } from 'lucide-react'

const capacityItems = [
  { key: 'capacity', label: 'Total capacity', icon: House, tone: '' },
  { key: 'occupied', label: 'Occupied', icon: Users, tone: 'occupied' },
  { key: 'reserved', label: 'Reserved', icon: BookmarkCheck, tone: 'reserved' },
  { key: 'available', label: 'Available', icon: BedDouble, tone: 'available' },
]

export default function ShelterCapacityOverview({ shelter, available }) {
  const values = { ...shelter, available }
  const percentageOfCapacity = (value) => shelter.capacity > 0
    ? Math.min(Math.max((value / shelter.capacity) * 100, 0), 100)
    : 0
  const occupiedPercent = percentageOfCapacity(shelter.occupied)
  const reservedPercent = percentageOfCapacity(shelter.reserved)
  const availablePercent = percentageOfCapacity(available)

  return (
    <section className="surface-card operator-card" aria-labelledby="capacity-heading">
      <div className="operator-card-heading">
        <div>
          <p className="operator-section-label">Live intake snapshot</p>
          <h2 id="capacity-heading">Capacity overview</h2>
        </div>
        <span className="status-badge success">{availablePercent.toFixed(0)}% available</span>
      </div>

      <dl className="capacity-metrics">
        {capacityItems.map(({ key, label, icon: Icon, tone }) => (
          <div className={`capacity-metric ${tone}`} key={key}>
            <div className="capacity-metric-top">
              <dt>{label}</dt>
              <span><Icon size={17} aria-hidden="true" /></span>
            </div>
            <dd>{values[key]}</dd>
          </div>
        ))}
      </dl>

      <div className="capacity-bar" aria-label="Capacity distribution">
        <span className="occupied" style={{ width: `${occupiedPercent}%` }} title={`${shelter.occupied} occupied`} />
        <span className="reserved" style={{ width: `${reservedPercent}%` }} title={`${shelter.reserved} reserved`} />
        <span className="available" style={{ width: `${availablePercent}%` }} title={`${available} available`} />
      </div>
      <div className="capacity-legend">
        <span style={{ color: 'var(--info)' }}><i aria-hidden="true" />Occupied</span>
        <span style={{ color: 'var(--warning)' }}><i aria-hidden="true" />Reserved</span>
        <span style={{ color: 'var(--success)' }}><i aria-hidden="true" />Available</span>
      </div>
    </section>
  )
}
