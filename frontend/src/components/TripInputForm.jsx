import { useState } from 'react'
import ThemeToggle from './ThemeToggle'
import HeroIllustration from './HeroIllustration'
import logoLight from '../assets/logo-light.png'
import logoDark from '../assets/logo-dark.png'

const MapPinIcon = () => (
  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
  </svg>
)

const ClockIcon = () => (
  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 3" />
  </svg>
)

function Field({ label, placeholder, value, onChange, icon, type = 'text', min, max }) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{label}</label>
      <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 rounded-lg px-3 py-2.5 focus-within:ring-2 focus-within:ring-amber/40 focus-within:border-amber transition">
        {icon}
        <input
          type={type}
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full outline-none text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-transparent"
        />
      </div>
    </div>
  )
}

export default function TripInputForm({ onSubmit, loading }) {
  const [currentLocation, setCurrentLocation] = useState('')
  const [pickupLocation, setPickupLocation] = useState('')
  const [dropoffLocation, setDropoffLocation] = useState('')
  const [cycleHoursUsed, setCycleHoursUsed] = useState('0')
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!currentLocation || !pickupLocation || !dropoffLocation) {
      setError('Please fill in all three locations.')
      return
    }
    const hours = Number(cycleHoursUsed)
    if (Number.isNaN(hours) || hours < 0 || hours > 70) {
      setError('Cycle hours used must be between 0 and 70.')
      return
    }
    setError('')
    onSubmit({ currentLocation, pickupLocation, dropoffLocation, cycleHoursUsed: hours })
  }

  return (
    <div className="min-h-screen bg-[#F5F6F8] dark:bg-[#0B1220] transition-colors">
      <div className="max-w-6xl mx-auto px-6 py-6 sm:py-8">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <img src={logoLight} alt="RouteLog" className="h-9 w-auto block dark:hidden object-contain" />
            <img src={logoDark} alt="RouteLog" className="h-9 w-auto hidden dark:block object-contain" />
          </div>
          <ThemeToggle />
        </div>

        {/* Main 2-column container */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-stretch">
          {/* Left Column: Hero Semi-Truck */}
          <div className="lg:col-span-2 hidden lg:block">
            <HeroIllustration />
          </div>

          {/* Right Column: Form Card */}
          <form
            onSubmit={handleSubmit}
            className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200/80 dark:border-slate-800 p-7 sm:p-8 flex flex-col justify-between"
          >
            <div>
              <div className="mb-6 text-left">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Plan Your Trip</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Enter trip details to generate a compliant route and ELD logs.
                </p>
              </div>

              <Field
                label="Current Location"
                placeholder="Enter current location"
                value={currentLocation}
                onChange={setCurrentLocation}
                icon={<MapPinIcon />}
              />
              <Field
                label="Pickup Location"
                placeholder="Enter pickup location"
                value={pickupLocation}
                onChange={setPickupLocation}
                icon={<MapPinIcon />}
              />
              <Field
                label="Dropoff Location"
                placeholder="Enter dropoff location"
                value={dropoffLocation}
                onChange={setDropoffLocation}
                icon={<MapPinIcon />}
              />
              <Field
                label="Current Cycle Used (Hrs)"
                placeholder="0"
                value={cycleHoursUsed}
                onChange={setCycleHoursUsed}
                icon={<ClockIcon />}
                type="number"
                min={0}
                max={70}
              />
              <div className="flex justify-between text-[11px] text-slate-400 dark:text-slate-500 -mt-2.5 mb-5">
                <span>Enter a value between 0 and 70 hours</span>
                <span>0 – 70</span>
              </div>

              {error && (
                <p className="text-xs text-red-600 dark:text-red-400 mb-4 bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#EA580C] hover:bg-[#C2410C] dark:bg-amber dark:hover:bg-amber-dark disabled:opacity-60 disabled:cursor-not-allowed transition text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 shadow-md shadow-orange-500/20"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Planning your trip…
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 13l2-5h9l3 5v5h-2a2 2 0 11-4 0H8a2 2 0 11-4 0H3v-5z" />
                  </svg>
                  Plan Trip
                </>
              )}
            </button>
          </form>
        </div>

        {/* Bottom Feature Badges matching Mockup */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
          <div className="flex items-center gap-3.5 bg-white/60 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200/70 dark:border-slate-800">
            <div className="w-10 h-10 rounded-full border border-slate-300 dark:border-slate-700 flex items-center justify-center shrink-0 text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 shadow-sm">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">HOS Compliant</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">Built with FMCSA rules</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 bg-white/60 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200/70 dark:border-slate-800">
            <div className="w-10 h-10 rounded-full border border-slate-300 dark:border-slate-700 flex items-center justify-center shrink-0 text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 shadow-sm">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 3" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Optimized Stops</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">Fuel & rest planning</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 bg-white/60 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200/70 dark:border-slate-800">
            <div className="w-10 h-10 rounded-full border border-slate-300 dark:border-slate-700 flex items-center justify-center shrink-0 text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 shadow-sm">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">ELD Logs</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">Auto-generated logs</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
