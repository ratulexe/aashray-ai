import {
  ArrowLeft,
  BedDouble,
  ClipboardCheck,
  PackageCheck,
  Plus,
  Utensils,
  Users,
  Warehouse,
} from 'lucide-react'
import { Link } from 'react-router-dom'

const referrals = [
  ['Family of four', 'ETA 18 min', 'Needs two lower beds'],
  ['Senior citizen', 'ETA 31 min', 'Medical check on arrival'],
  ['Two night-stay guests', 'ETA 44 min', 'Meal tokens requested'],
]

const supplies = [
  ['Meals', '84 available'],
  ['Blankets', '39 available'],
  ['Hygiene kits', '27 available'],
]

function Shelter() {
  return (
    <main className="page role-page shelter-theme">
      <RoleNav current="Shelter Operator" />

      <section className="role-hero">
        <div>
          <p className="eyebrow">Shelter Operator page</p>
          <h1>Run shelter intake with confidence</h1>
          <p>
            Keep beds, referrals, supplies, and arrival notes aligned with the
            wider Aashray AI network.
          </p>
        </div>
        <div className="status-card">
          <BedDouble size={22} aria-hidden="true" />
          <span>Available tonight</span>
          <strong>26 open beds</strong>
          <small>11 for families, 15 for individuals</small>
        </div>
      </section>

      <section className="stats-strip" aria-label="Shelter metrics">
        <div>
          <Users size={21} aria-hidden="true" />
          <strong>74</strong>
          <span>current guests</span>
        </div>
        <div>
          <ClipboardCheck size={21} aria-hidden="true" />
          <strong>9</strong>
          <span>referrals inbound</span>
        </div>
        <div>
          <Utensils size={21} aria-hidden="true" />
          <strong>112</strong>
          <span>meals prepared</span>
        </div>
      </section>

      <section className="workspace-grid">
        <div className="tool-panel wide">
          <div className="section-heading">
            <h2>Incoming referrals</h2>
            <span>Operator queue</span>
          </div>
          <div className="incident-list">
            {referrals.map(([title, eta, detail]) => (
              <article className="incident-row" key={title}>
                <span className="row-icon">
                  <ClipboardCheck size={20} aria-hidden="true" />
                </span>
                <div>
                  <h3>{title}</h3>
                  <p>{detail}</p>
                </div>
                <strong className="eta">{eta}</strong>
              </article>
            ))}
          </div>
        </div>

        <div className="tool-panel">
          <div className="section-heading">
            <h2>Supplies</h2>
          </div>
          <div className="capacity-list">
            {supplies.map(([item, amount]) => (
              <div className="capacity-row" key={item}>
                <div>
                  <strong>{item}</strong>
                  <span>Inventory synced</span>
                </div>
                <span>{amount}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="tool-panel">
          <div className="section-heading">
            <h2>Update desk</h2>
          </div>
          <div className="quick-actions">
            <button type="button">
              <Plus size={19} aria-hidden="true" />
              Add beds
            </button>
            <button type="button">
              <PackageCheck size={19} aria-hidden="true" />
              Log supplies
            </button>
            <button type="button">
              <Warehouse size={19} aria-hidden="true" />
              Close intake
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

export default Shelter
