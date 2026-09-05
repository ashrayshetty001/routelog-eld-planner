import { useState } from 'react'
import RouteMap from './RouteMap'
import DailyLogSheet from './DailyLogSheet'
import ThemeToggle from './ThemeToggle'
import logoLight from '../assets/logo-light.png'
import logoDark from '../assets/logo-dark.png'

function StatCard({ label, value, sub, icon, iconBg, iconColor, rightElement }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 px-5 py-4 flex items-center justify-between shadow-xs">
      <div className="flex items-center gap-3.5">
        {icon && (
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconBg} ${iconColor}`}>
            {icon}
          </div>
        )}
        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>
          <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{value}</p>
          {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>}
        </div>
      </div>
      {rightElement}
    </div>
  )
}

function CycleRing({ usedPct }) {
  const r = 22
  const c = 2 * Math.PI * r
  const offset = c - (Math.min(100, Math.max(0, usedPct)) / 100) * c
  return (
    <div className="relative w-13 h-13 flex items-center justify-center">
      <svg viewBox="0 0 56 56" className="w-13 h-13 -rotate-90">
        <circle cx="28" cy="28" r={r} stroke="#E2E8F0" strokeWidth="4.5" fill="none" className="dark:stroke-slate-800" />
        <circle
          cx="28" cy="28" r={r}
          stroke={usedPct >= 90 ? '#DC2626' : '#EA580C'}
          strokeWidth="4.5" fill="none"
          strokeDasharray={c} strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-[11px] font-bold text-slate-800 dark:text-slate-100">{Math.round(usedPct)}%</span>
    </div>
  )
}

const LEGEND = [
  { type: 'current', label: 'Current Location', color: '#2563EB' },
  { type: 'pickup', label: 'Pickup', color: '#F2913D' },
  { type: 'dropoff', label: 'Dropoff', color: '#0B1E39' },
  { type: 'fuel', label: 'Fuel Stop', color: '#16A34A' },
  { type: 'rest', label: 'Rest Stop', color: '#DC2626' },
]

export default function ResultsDashboard({ result, onBack }) {
  const [activeDay, setActiveDay] = useState(0)
  const [showFullLogsModal, setShowFullLogsModal] = useState(false)
  const { trip, summary, map, trip_stops, daily_logs } = result

  const usedPct = Math.min(100, (summary.cycle_hours_used_at_end / 70) * 100)

  const handlePrintLogs = () => {
    window.print()
  }

  const handleExportSummary = () => {
    const exportData = {
      trip,
      summary,
      daily_logs,
      trip_stops,
      generated_at: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `RouteLog-${trip.current_location}-to-${trip.dropoff_location}.json`.replace(/[^a-zA-Z0-9-.]/g, '_')
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const tripId = trip.trip_id || `TRP-2024-${String(Math.floor(1000 + Math.random() * 9000))}`
  const plannedDateStr = trip.start_time
    ? new Date(trip.start_time).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })

  return (
    <div className="min-h-screen bg-[#F5F6F8] dark:bg-[#0B1220] transition-colors print:bg-white print:p-0">
      {/* Top nav (White in light theme, dark in dark theme) */}
      <div className="bg-white dark:bg-[#0B1220] border-b border-slate-200 dark:border-slate-800 px-6 sm:px-8 py-3.5 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <img src={logoLight} alt="RouteLog" className="h-8 w-auto block dark:hidden object-contain" />
          <img src={logoDark} alt="RouteLog" className="h-8 w-auto hidden dark:block object-contain" />
        </div>
        <ThemeToggle />
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 print:px-0 print:py-0">
        <button
          onClick={onBack}
          className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 mb-4 print:hidden transition"
        >
          &larr; Back to Trips
        </button>

        {/* Header Row: Trip Title, Badges, and Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-2 print:hidden">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {trip.current_location} <span className="text-slate-400 dark:text-slate-500 font-normal">&rarr;</span> {trip.dropoff_location}
              </h2>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                summary.compliant
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                  : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800'
              }`}>
                {summary.compliant ? 'HOS Compliant' : 'HOS Attention Needed'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Trip ID: <span className="font-semibold text-slate-700 dark:text-slate-300">{tripId}</span> &bull; Planned on {plannedDateStr}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFullLogsModal(true)}
              title="Download Logs"
              className="border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition rounded-lg px-4 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 flex items-center gap-2 shadow-xs"
            >
              <svg className="w-4 h-4 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Logs
            </button>
            <button
              onClick={handleExportSummary}
              title="Export Trip JSON Data"
              className="bg-navy hover:bg-navy/90 dark:bg-amber dark:hover:bg-amber-dark text-white dark:text-navy rounded-lg px-4 py-2 text-xs font-semibold transition flex items-center gap-2 shadow-xs"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Export Summary
            </button>
          </div>
        </div>

        {!summary.compliant && summary.warnings.length > 0 && (
          <div className="mb-5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl px-4 py-3 text-sm text-red-700 dark:text-red-400 print:hidden">
            {summary.warnings.map((w, i) => <p key={i}>⚠ {w.message}</p>)}
          </div>
        )}
        {summary.used_34hr_restart && summary.compliant && (
          <div className="mb-5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl px-4 py-3 text-sm text-amber-800 dark:text-amber-400 print:hidden">
            ℹ A 34-hour restart was scheduled during this trip to stay within the 70-hour/8-day limit.
          </div>
        )}

        {/* 4 Stat Cards with circular icons matching Mockup */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 print:hidden">
          {/* 1. Distance */}
          <StatCard
            label="Total Distance"
            value={`${Number(summary.total_distance_miles).toLocaleString()} mi`}
            iconBg="bg-blue-50 dark:bg-blue-950/40"
            iconColor="text-blue-600 dark:text-blue-400"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            }
          />

          {/* 2. Total Drive Time */}
          <StatCard
            label="Total Drive Time"
            value={formatHM(summary.total_driving_hours)}
            sub={`Driving: ${formatHM(summary.total_driving_hours)}`}
            iconBg="bg-emerald-50 dark:bg-emerald-950/40"
            iconColor="text-emerald-600 dark:text-emerald-400"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 3" />
              </svg>
            }
          />

          {/* 3. Number of Days */}
          <StatCard
            label="Number of Days"
            value={summary.number_of_days}
            iconBg="bg-purple-50 dark:bg-purple-950/40"
            iconColor="text-purple-600 dark:text-purple-400"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
          />

          {/* 4. Cycle Hours */}
          <StatCard
            label="Cycle Hours"
            value={`${summary.cycle_hours_used_at_end}h / 70h`}
            sub={<span className="text-[#EA580C] dark:text-amber font-medium">Remaining {summary.cycle_hours_remaining}h</span>}
            rightElement={<CycleRing usedPct={usedPct} />}
          />
        </div>

        {/* Map and Sidebar Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 mb-6 print:hidden">
          <div className="lg:col-span-3 h-[440px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xs relative">
            <RouteMap geometry={map.geometry} markers={map.markers} />
          </div>

          <div className="space-y-4">
            {/* Legend Card */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs">
              <h4 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider mb-3">Legend</h4>
              <div className="space-y-2">
                {LEGEND.map((l) => (
                  <div key={l.type} className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs" style={{ background: l.color }} />
                    <span className="font-medium">{l.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Trip Stops Card */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs">
              <h4 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider mb-3">Trip Stops</h4>
              <div className="space-y-3.5 max-h-[230px] overflow-y-auto pr-1">
                {trip_stops.map((s, i) => {
                  const isPickup = s.type.toLowerCase() === 'pickup'
                  const isFuel = s.type.toLowerCase() === 'fuel'
                  const isRest = s.type.toLowerCase() === 'rest'
                  const circleColor = isPickup ? 'bg-amber' : isFuel ? 'bg-green-600' : isRest ? 'bg-red-600' : 'bg-navy dark:bg-slate-700'

                  return (
                    <div key={i} className="flex items-start gap-2.5 text-xs">
                      <div className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${circleColor}`} />
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-200 leading-tight">
                          {s.location} ({s.type})
                        </p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                          {formatHM(s.duration_hours)} &bull; {new Date(s.arrived_at).toLocaleString(undefined, {
                            month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Daily Logs Section matching Screen 2 Mockup */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs print:border-none print:p-0 print:bg-white">
          <div className="flex items-center justify-between mb-1 print:hidden">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Daily Logs</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Review the ELD logs for each day of your trip.</p>
            </div>
            <button
              onClick={() => setShowFullLogsModal(true)}
              className="border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition shadow-xs"
            >
              <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              View Full Logs
            </button>
          </div>

          <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 my-3 print:hidden">
            {daily_logs.map((d, i) => (
              <button
                key={d.date}
                onClick={() => setActiveDay(i)}
                className={`px-4 py-2 text-xs font-bold border-b-2 -mb-px transition ${
                  activeDay === i
                    ? 'border-[#EA580C] text-[#EA580C] dark:border-amber dark:text-amber'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                Day {i + 1}
              </button>
            ))}
          </div>

          {daily_logs[activeDay] && (
            <DailyLogSheet
              day={daily_logs[activeDay]}
              trip={trip}
              dayIndex={activeDay}
              compact={true}
            />
          )}
        </div>
      </div>

      {/* Full Logs Modal Dialog (FMCSA Official Document Format) */}
      {showFullLogsModal && (
        <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  FMCSA Driver&apos;s Daily Log Sheet
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {trip.current_location} &rarr; {trip.dropoff_location} &bull; Trip ID: {tripId}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintLogs}
                  className="bg-navy dark:bg-amber text-white dark:text-navy hover:opacity-90 px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print / Save PDF
                </button>
                <button
                  onClick={() => setShowFullLogsModal(false)}
                  className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-lg"
                >
                  &times;
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-8">
              {daily_logs.map((d, i) => (
                <div key={d.date} className="border-b border-slate-200 dark:border-slate-800 pb-6 last:border-b-0">
                  <DailyLogSheet
                    day={d}
                    trip={trip}
                    dayIndex={i}
                    compact={false}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function formatHM(hours) {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return `${h}h ${String(m).padStart(2, '0')}m`
}
