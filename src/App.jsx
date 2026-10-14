import { useState, useEffect, useRef } from 'react'
import telephoneData from 'country-telephone-data'
import './App.css'

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const COUNTRIES = telephoneData.allCountries
const TITLES = {
  Manager: 1500,
  'Jr. Manager': 1000,
  Clerk: 800,
  'Sales Executive': 500,
}

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  phoneCountry: 'in',
  phoneCode: '91',
  address: '',
  title: 'Manager',
  salary: '1500',
  period: 'day',
  hours: '8',
  days: [true, true, true, true, true, false, false],
}

/* ---------- date helpers (dd-mm-yyyy) ---------- */
function isoToDmy(v) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || '')
  return m ? `${m[3]}-${m[2]}-${m[1]}` : v || ''
}

function parseDmy(str) {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(str || '')
  if (!m) return null
  const d = Number(m[1])
  const mo = Number(m[2])
  const y = Number(m[3])
  if (y < 1900) return null
  const t = Date.UTC(y, mo - 1, d)
  const c = new Date(t)
  if (
    c.getUTCFullYear() !== y ||
    c.getUTCMonth() !== mo - 1 ||
    c.getUTCDate() !== d
  )
    return null
  return t
}

function dmyToIso(str) {
  return parseDmy(str) === null
    ? ''
    : `${str.slice(6)}-${str.slice(3, 5)}-${str.slice(0, 2)}`
}

function dailyRate(p) {
  const workingDays = p.days.filter(Boolean).length || 1
  if (p.period === 'day') return p.salary
  if (p.period === 'week') return p.salary / workingDays
  return p.salary / (workingDays * (52 / 12)) // month
}

const money = (n) =>
  '₹ ' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 })

/* ---------- date input with visible calendar button ---------- */
function DateField({ value, onChange }) {
  const pickerRef = useRef(null)

  const handleText = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 8)
    let out = digits
    if (digits.length > 4)
      out = digits.slice(0, 2) + '-' + digits.slice(2, 4) + '-' + digits.slice(4)
    else if (digits.length > 2) out = digits.slice(0, 2) + '-' + digits.slice(2)
    onChange(out)
  }

  const openPicker = () => {
    const el = pickerRef.current
    if (!el) return
    try {
      el.showPicker()
    } catch {
      el.focus()
      el.click()
    }
  }

  const handlePicked = (e) => {
    if (e.target.value) onChange(isoToDmy(e.target.value))
  }

  return (
    <div className="date-field">
      <input
        type="text"
        inputMode="numeric"
        placeholder="dd-mm-yyyy"
        maxLength={10}
        value={value}
        onChange={handleText}
      />
      <button
        type="button"
        className="cal-btn"
        onClick={openPicker}
        aria-label="Open calendar"
        title="Open calendar"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="4" width="18" height="18" rx="3" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </button>
      <input
        ref={pickerRef}
        type="date"
        className="hidden-date"
        tabIndex={-1}
        aria-hidden="true"
        value={dmyToIso(value)}
        onChange={handlePicked}
      />
    </div>
  )
}

export default function App() {
  const [profiles, setProfiles] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('wage-profiles')) || []
      return saved.map((p) => ({
        ...p,
        doj: isoToDmy(p.doj),
        dop: isoToDmy(p.dop),
      }))
    } catch {
      return []
    }
  })
  const [selectedId, setSelectedId] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')
  const [result, setResult] = useState(null)
  const [calcError, setCalcError] = useState('')

  useEffect(() => {
    localStorage.setItem('wage-profiles', JSON.stringify(profiles))
  }, [profiles])

  const selected = profiles.find((p) => p.id === selectedId)

  // ---------- form handlers ----------
  const setField = (key, value) => setForm({ ...form, [key]: value })

  const changeTitle = (title) =>
    setForm({
      ...form,
      title,
      salary: String(TITLES[title]),
      period: 'day',
      hours: '8',
    })

  const changeHours = (value) => {
    if (value === '') return setField('hours', '')
    const n = Math.min(24, Math.max(0, Number(value))) // never above 24
    setField('hours', String(n))
  }

  const toggleDay = (i) =>
    setForm({ ...form, days: form.days.map((d, idx) => (idx === i ? !d : d)) })

  const openForm = () => {
    setForm(emptyForm)
    setFormError('')
    setShowForm(true)
  }

  const discardChanges = () => {
    setForm(emptyForm)
    setFormError('')
    setShowForm(false)
  }

  const saveChanges = () => {
    if (!form.name.trim()) return setFormError('Please enter the full name.')
    if (!(Number(form.salary) > 0)) return setFormError('Please enter a salary.')
    if (!(Number(form.hours) > 0 && Number(form.hours) <= 24))
      return setFormError('Hours must be between 1 and 24.')
    if (!form.days.some(Boolean))
      return setFormError('Select at least one working day.')

    const profile = {
      ...form,
      id: Date.now().toString(),
      salary: Number(form.salary),
      hours: Number(form.hours),
      doj: '',
      dop: '',
      leaves: 0,
    }
    setProfiles([...profiles, profile])
    setSelectedId(profile.id)
    setResult(null)
    setShowForm(false)
  }

  const removeProfile = () => {
    if (!selected) return
    if (!window.confirm(`Remove profile "${selected.name}"?`)) return
    setProfiles(profiles.filter((p) => p.id !== selectedId))
    setSelectedId('')
    setResult(null)
  }

  // ---------- selected profile handlers ----------
  const updateSelected = (key, value) => {
    setProfiles(
      profiles.map((p) => (p.id === selectedId ? { ...p, [key]: value } : p))
    )
    setResult(null)
    setCalcError('')
  }

  const selectProfile = (id) => {
    setSelectedId(id)
    setResult(null)
    setCalcError('')
  }

  const calculate = () => {
    const start = parseDmy(selected.doj)
    const end = parseDmy(selected.dop)
    if (start === null || end === null)
      return setCalcError('Please enter valid dates in dd-mm-yyyy format.')
    const diff = Math.round((end - start) / 86400000)
    if (diff < 0)
      return setCalcError('Date of payment cannot be before date of joining.')
    const leaves = Number(selected.leaves) || 0
    const worked = Math.max(0, diff - leaves)
    const rate = dailyRate(selected)
    setCalcError('')
    setResult({
      doj: selected.doj,
      dop: selected.dop,
      diff,
      leaves,
      worked,
      rate,
      total: worked * rate,
    })
  }

  return (
    <div className="app">
      <h1 className="heading">Daily Wage Employee Salary Calculator</h1>

      <div className="layout">
        {/* ---------------- LEFT PANEL ---------------- */}
        <aside className="panel left">
          <h4 className="section-title">Profiles</h4>
          <div className="row">
            <select
              value={selectedId}
              onChange={(e) => selectProfile(e.target.value)}
            >
              <option value="">Select profile</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.title})
                </option>
              ))}
            </select>
            <button className="btn primary" onClick={openForm}>
              Create profile
            </button>
          </div>

          {selected && (
            <button className="btn danger full" onClick={removeProfile}>
              Remove profile
            </button>
          )}
          {profiles.length === 0 && (
            <p className="muted">No profiles yet. Create one to begin.</p>
          )}
        </aside>

        {/* ---------------- RIGHT PANEL ---------------- */}
        <main className="panel right">
          {!selected ? (
            <p className="muted">Select a profile to see details.</p>
          ) : (
            <>
              <div className="profile-head">
                <div className="avatar">{selected.name[0].toUpperCase()}</div>
                <div>
                  <h2 className="profile-name">{selected.name}</h2>
                  <span className="badge">{selected.title}</span>
                </div>
              </div>

              <div className="details">
                <div className="tile">
                  <span>Salary</span>
                  <b>
                    {money(selected.salary)} / {selected.period}
                  </b>
                </div>
                <div className="tile">
                  <span>Working hours</span>
                  <b>{selected.hours} hrs / day</b>
                </div>
                <div className="tile">
                  <span>Email</span>
                  <b>{selected.email || '—'}</b>
                </div>
                <div className="tile">
                  <span>Phone</span>
                  <b>
                    {selected.phone
                      ? `${selected.phoneCode ? `+${selected.phoneCode} ` : ''}${selected.phone}`
                      : '—'}
                  </b>
                </div>
                <div className="tile wide">
                  <span>Address</span>
                  <b>{selected.address || '—'}</b>
                </div>
              </div>

              <h4 className="section-title">Formal working days</h4>
              <div className="days">
                {DAY_LETTERS.map((l, i) => (
                  <span
                    key={i}
                    title={DAY_NAMES[i]}
                    className={'day-chip' + (selected.days[i] ? ' on' : '')}
                  >
                    {l}
                  </span>
                ))}
              </div>

              <div className="card">
                <h4 className="section-title">Total days worked</h4>
                <div className="grid">
                  <label>
                    Date of joining
                    <DateField
                      value={selected.doj}
                      onChange={(v) => updateSelected('doj', v)}
                    />
                  </label>
                  <label>
                    Date of payment
                    <DateField
                      value={selected.dop}
                      onChange={(v) => updateSelected('dop', v)}
                    />
                  </label>
                  <label>
                    Total leaves taken
                    <input
                      type="number"
                      min="0"
                      value={selected.leaves}
                      onChange={(e) => updateSelected('leaves', e.target.value)}
                    />
                  </label>
                </div>
                <p className="muted small">
                  Total days worked = (date of payment − date of joining) −
                  total leaves taken
                </p>
              </div>

              <button className="btn primary big" onClick={calculate}>
                Total salary
              </button>
              {calcError && <p className="error">{calcError}</p>}

              {result && (
                <div className="result">
                  <div className="line">
                    <span>Employee</span>
                    <b>
                      {selected.name} ({selected.title})
                    </b>
                  </div>
                  <div className="line">
                    <span>Date of joining</span>
                    <b>{result.doj}</b>
                  </div>
                  <div className="line">
                    <span>Date of payment</span>
                    <b>{result.dop}</b>
                  </div>
                  <div className="line">
                    <span>Days between joining and payment</span>
                    <b>{result.diff}</b>
                  </div>
                  <div className="line">
                    <span>Leaves taken</span>
                    <b>{result.leaves}</b>
                  </div>
                  <div className="line">
                    <span>Total days worked</span>
                    <b>{result.worked}</b>
                  </div>
                  <div className="line">
                    <span>Rate per day ({selected.hours} hrs)</span>
                    <b>{money(result.rate)}</b>
                  </div>
                  <div className="line final">
                    <span>
                      Final salary = {result.worked} × {money(result.rate)}
                    </span>
                    <b>{money(result.total)}</b>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* ---------------- POPUP ---------------- */}
      {showForm && (
        <div className="overlay">
          <div className="modal">
            <h3>Create profile</h3>

            <div className="grid2">
              <label>
                Full name
                <input
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                />
              </label>
              <label>
                Position
                <select
                  value={form.title}
                  onChange={(e) => changeTitle(e.target.value)}
                >
                  {Object.keys(TITLES).map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setField('email', e.target.value)}
                />
              </label>
              <label>
                Phone
                <div className="phone-input">
                  <select
                    aria-label="Country calling code"
                    value={form.phoneCountry}
                    onChange={(e) => {
                      const country = COUNTRIES.find(
                        (entry) => entry.iso2 === e.target.value,
                      )
                      if (country)
                        setForm({
                          ...form,
                          phoneCountry: country.iso2,
                          phoneCode: country.dialCode,
                        })
                    }}
                  >
                    {COUNTRIES.map((country) => (
                      <option key={country.iso2} value={country.iso2}>
                        {country.name} (+{country.dialCode})
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    inputMode="tel"
                    placeholder="Phone number"
                    value={form.phone}
                    onChange={(e) => setField('phone', e.target.value)}
                  />
                </div>
              </label>
            </div>

            <label>
              Address
              <input
                value={form.address}
                onChange={(e) => setField('address', e.target.value)}
              />
            </label>

            <div className="grid2">
              <label>
                Salary (₹)
                <input
                  type="number"
                  min="0"
                  value={form.salary}
                  onChange={(e) => setField('salary', e.target.value)}
                />
              </label>
              <label>
                Per
                <select
                  value={form.period}
                  onChange={(e) => setField('period', e.target.value)}
                >
                  <option value="day">Day</option>
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                </select>
              </label>
            </div>

            <label>
              Working hours per day (max 24)
              <input
                type="number"
                min="1"
                max="24"
                value={form.hours}
                onChange={(e) => changeHours(e.target.value)}
              />
            </label>

            <p className="label-text">Working days</p>
            <div className="days">
              {DAY_LETTERS.map((l, i) => (
                <button
                  type="button"
                  key={i}
                  title={DAY_NAMES[i]}
                  className={'day-chip' + (form.days[i] ? ' on' : '')}
                  onClick={() => toggleDay(i)}
                >
                  {l}
                </button>
              ))}
            </div>

            {formError && <p className="error">{formError}</p>}

            <div className="actions">
              <button className="btn ghost" onClick={discardChanges}>
                Discard changes
              </button>
              <button className="btn primary" onClick={saveChanges}>
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// import { useState } from 'react'
// import heroImg from './assets/hero.png'
// import reactLogo from './assets/react.svg'
// import viteLogo from './assets/vite.svg'
// import './App.css'

// function App() {
//   const [count, setCount] = useState(0)

//   return (
//     <>
//       <section id="center">
//         <div className="hero">
//           <img src={heroImg} className="base" width="170" height="179" alt="" />
//           <img src={reactLogo} className="framework" alt="React logo" />
//           <img src={viteLogo} className="vite" alt="Vite logo" />
//         </div>
//         <div>
//           <h1>Get started</h1>
//           <p>
//             Edit <code>src/App.jsx</code> and save to test <code>HMR</code>
//           </p>
//         </div>
//         <button
//           type="button"
//           className="counter"
//           onClick={() => setCount((count) => count + 1)}
//         >
//           Count is {count}
//         </button>
//       </section>

//       <div className="ticks"></div>

//       <section id="next-steps">
//         <div id="docs">
//           <svg className="icon" role="presentation" aria-hidden="true">
//             <use href="/icons.svg#documentation-icon"></use>
//           </svg>
//           <h2>Documentation</h2>
//           <p>Your questions, answered</p>
//           <ul>
//             <li>
//               <a href="https://vite.dev/" target="_blank">
//                 <img className="logo" src={viteLogo} alt="" />
//                 Explore Vite
//               </a>
//             </li>
//             <li>
//               <a href="https://react.dev/" target="_blank">
//                 <img className="button-icon" src={reactLogo} alt="" />
//                 Learn more
//               </a>
//             </li>
//           </ul>
//         </div>
//         <div id="social">
//           <svg className="icon" role="presentation" aria-hidden="true">
//             <use href="/icons.svg#social-icon"></use>
//           </svg>
//           <h2>Connect with us</h2>
//           <p>Join the Vite community</p>
//           <ul>
//             <li>
//               <a href="https://github.com/vitejs/vite" target="_blank">
//                 <svg
//                   className="button-icon"
//                   role="presentation"
//                   aria-hidden="true"
//                 >
//                   <use href="/icons.svg#github-icon"></use>
//                 </svg>
//                 GitHub
//               </a>
//             </li>
//             <li>
//               <a href="https://chat.vite.dev/" target="_blank">
//                 <svg
//                   className="button-icon"
//                   role="presentation"
//                   aria-hidden="true"
//                 >
//                   <use href="/icons.svg#discord-icon"></use>
//                 </svg>
//                 Discord
//               </a>
//             </li>
//             <li>
//               <a href="https://x.com/vite_js" target="_blank">
//                 <svg
//                   className="button-icon"
//                   role="presentation"
//                   aria-hidden="true"
//                 >
//                   <use href="/icons.svg#x-icon"></use>
//                 </svg>
//                 X.com
//               </a>
//             </li>
//             <li>
//               <a href="https://bsky.app/profile/vite.dev" target="_blank">
//                 <svg
//                   className="button-icon"
//                   role="presentation"
//                   aria-hidden="true"
//                 >
//                   <use href="/icons.svg#bluesky-icon"></use>
//                 </svg>
//                 Bluesky
//               </a>
//             </li>
//           </ul>
//         </div>
//       </section>

//       <div className="ticks"></div>
//       <section id="spacer"></section>
//     </>
//   )
// }

// export default App
