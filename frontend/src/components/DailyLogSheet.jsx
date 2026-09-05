import React from 'react'

const ROWS = [
  { key: 'OFF_DUTY', num: '1.', label: 'OFF DUTY', color: '#475569' },
  { key: 'SLEEPER_BERTH', num: '2.', label: 'SLEEPER\nBERTH', color: '#16A34A' },
  { key: 'DRIVING', num: '3.', label: 'DRIVING', color: '#2563EB' },
  { key: 'ON_DUTY_NOT_DRIVING', num: '4.', label: 'ON DUTY\n(not driving)', color: '#EA580C' },
]

const CHART_LEFT = 140
const CHART_WIDTH = 720
const TOTALS_WIDTH = 80
const CHART_TOP = 28
const ROW_HEIGHT = 32
const HOURS = 24

/**
 * Renders an authentic FMCSA Driver's Daily Log (49 CFR § 395.8)
 * with a 24-hour stepped-line grid, quarter-hour ticks, right-side totals column (= 24 hrs),
 * remarks section, and 70-hour / 8-day recap table.
 */
export default function DailyLogSheet({ day, trip, dayIndex = 0, compact = false }) {
  const [showAllRemarks, setShowAllRemarks] = React.useState(false)
  const width = CHART_LEFT + CHART_WIDTH + TOTALS_WIDTH + 10
  const hourWidth = CHART_WIDTH / HOURS
  const chartHeight = ROWS.length * ROW_HEIGHT
  const height = CHART_TOP + chartHeight + 32

  const rowY = (key) => CHART_TOP + ROWS.findIndex((r) => r.key === key) * ROW_HEIGHT + ROW_HEIGHT / 2

  // Build stepped polyline path
  const sorted = [...day.segments].sort((a, b) => a.start_hour - b.start_hour)

  const drivingHrs = day.totals.DRIVING || 0
  const onDutyHrs = (day.totals.DRIVING || 0) + (day.totals.ON_DUTY_NOT_DRIVING || 0)
  const offDutyHrs = (day.totals.OFF_DUTY || 0) + (day.totals.SLEEPER_BERTH || 0)
  const totalHours = Object.values(day.totals).reduce((a, b) => a + b, 0)

  const recap = day.recap || {
    on_duty_today: onDutyHrs,
    total_duty_last_7_days: onDutyHrs,
    hours_available_tomorrow: Math.max(0, 70 - onDutyHrs),
    total_duty_last_8_days: onDutyHrs,
  }

  const formattedDate = new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  // Format remarks string
  const remarksItems = day.segments
    .filter((s) => s.label && !s.label.toLowerCase().includes('prior to shift') && !s.label.toLowerCase().includes('after shift'))
    .map((s) => `${formatClock(s.start_hour)} - ${s.label}`)

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-xl ${compact ? '' : 'border border-slate-200 dark:border-slate-800 p-6 print:border-none print:p-2'} print:bg-white print:text-black`}>
      {/* Subheader bar for compact mode (matches mockup Screen 2) */}
      {compact ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="font-semibold text-slate-900 dark:text-white">
            Day {dayIndex + 1} &bull; {formattedDate}
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <span className="text-blue-600 dark:text-blue-400">Driving: {formatHMColon(drivingHrs)}</span>
            <span className="text-orange-600 dark:text-orange-400">On Duty: {formatHMColon(onDutyHrs)}</span>
            <span className="text-slate-500 dark:text-slate-400">Off Duty: {formatHMColon(offDutyHrs)}</span>
          </div>
        </div>
      ) : (
        /* Official Header for Full Log Mode */
        <div className="border-b-2 border-slate-800 dark:border-slate-700 pb-3 mb-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="text-[10px] tracking-wider uppercase font-semibold text-slate-500 dark:text-slate-400">
                U.S. DEPARTMENT OF TRANSPORTATION — FEDERAL MOTOR CARRIER SAFETY ADMINISTRATION
              </div>
              <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-white uppercase mt-0.5">
                Driver&apos;s Daily Log <span className="text-sm font-normal text-slate-500 dark:text-slate-400">(One Calendar Day — 24 Hours)</span>
              </h3>
            </div>
            <div className="text-right text-xs">
              <span className="inline-block bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded font-mono font-semibold text-slate-700 dark:text-slate-300">
                DAY {dayIndex + 1} OF TRIP
              </span>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs">
            <div>
              <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-bold">Date</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{formattedDate}</span>
            </div>
            <div>
              <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-bold">Carrier / Terminal</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">Spotter Freight Lines</span>
            </div>
            <div>
              <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-bold">From &rarr; To</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                {trip ? `${trip.current_location} → ${trip.dropoff_location}` : 'Interstate Route'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-bold">Vehicle Unit / Trailer</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">Tractor #408 / Van 53</span>
            </div>
          </div>
        </div>
      )}

      {/* SVG Log Grid */}
      <div className="overflow-x-auto my-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[760px] h-auto select-none font-sans">
          {/* Header Row: Midnight, Hours, Noon, Midnight, Total Hours */}
          {Array.from({ length: HOURS + 1 }).map((_, h) => {
            const x = CHART_LEFT + h * hourWidth
            return (
              <text
                key={`hdr-${h}`}
                x={x}
                y={CHART_TOP - 8}
                textAnchor="middle"
                fontSize="9"
                fontWeight={h % 6 === 0 ? '700' : '500'}
                fill="currentColor"
                className="text-slate-600 dark:text-slate-400"
              >
                {h === 0 ? 'Mid' : h === 12 ? 'Noon' : h === 24 ? 'Mid' : h}
              </text>
            )
          })}

          <text
            x={CHART_LEFT + CHART_WIDTH + TOTALS_WIDTH / 2}
            y={CHART_TOP - 8}
            textAnchor="middle"
            fontSize="9"
            fontWeight="700"
            fill="currentColor"
            className="text-slate-700 dark:text-slate-300 uppercase tracking-tight"
          >
            Total Hours
          </text>

          {/* Background Grid Box */}
          <rect
            x={CHART_LEFT}
            y={CHART_TOP}
            width={CHART_WIDTH}
            height={chartHeight}
            fill="none"
            stroke="currentColor"
            className="text-slate-400 dark:text-slate-600"
            strokeWidth={1.5}
          />

          {/* Totals Column Box */}
          <rect
            x={CHART_LEFT + CHART_WIDTH}
            y={CHART_TOP}
            width={TOTALS_WIDTH}
            height={chartHeight}
            fill="none"
            stroke="currentColor"
            className="text-slate-400 dark:text-slate-600"
            strokeWidth={1.5}
          />

          {/* Row Dividers & Labels */}
          {ROWS.map((row, idx) => {
            const y = CHART_TOP + idx * ROW_HEIGHT
            const val = day.totals[row.key] || 0
            return (
              <g key={row.key}>
                {/* Horizontal row line */}
                {idx > 0 && (
                  <line
                    x1={CHART_LEFT}
                    x2={CHART_LEFT + CHART_WIDTH + TOTALS_WIDTH}
                    y1={y}
                    y2={y}
                    stroke="currentColor"
                    className="text-slate-300 dark:text-slate-700"
                    strokeWidth={1}
                  />
                )}

                {/* Left Row Label */}
                <text
                  x={CHART_LEFT - 12}
                  y={y + ROW_HEIGHT / 2 + 4}
                  textAnchor="end"
                  fontSize="10"
                  fontWeight="600"
                  fill="currentColor"
                  className="text-slate-800 dark:text-slate-200"
                >
                  <tspan fontWeight="700" className="text-slate-500 mr-1">{row.num} </tspan>
                  {row.label.split('\n').map((line, i) => (
                    <tspan key={i} x={CHART_LEFT - 12} dy={i === 0 ? 0 : 10}>
                      {line}
                    </tspan>
                  ))}
                </text>

                {/* Right Totals Value */}
                <text
                  x={CHART_LEFT + CHART_WIDTH + TOTALS_WIDTH / 2}
                  y={y + ROW_HEIGHT / 2 + 4}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="700"
                  fill="currentColor"
                  className="text-slate-900 dark:text-white font-mono"
                >
                  {val > 0 ? formatHMColon(val) : '0:00'}
                </text>
              </g>
            )
          })}

          {/* Vertical Hour Lines & Quarter-Hour Ticks */}
          {Array.from({ length: HOURS }).map((_, h) => {
            const hourX = CHART_LEFT + h * hourWidth
            return (
              <g key={`hour-${h}`}>
                {/* Major vertical hour line */}
                {h > 0 && (
                  <line
                    x1={hourX}
                    x2={hourX}
                    y1={CHART_TOP}
                    y2={CHART_TOP + chartHeight}
                    stroke="currentColor"
                    className={h % 6 === 0 ? 'text-slate-400 dark:text-slate-600' : 'text-slate-200 dark:text-slate-800'}
                    strokeWidth={h % 6 === 0 ? 1.2 : 0.8}
                  />
                )}

                {/* Quarter-hour ticks across rows */}
                {ROWS.map((_, rIdx) => {
                  const ry = CHART_TOP + rIdx * ROW_HEIGHT
                  return [0.25, 0.5, 0.75].map((frac) => {
                    const tx = hourX + frac * hourWidth
                    const tickH = frac === 0.5 ? 8 : 4
                    return (
                      <line
                        key={`tick-${h}-${rIdx}-${frac}`}
                        x1={tx}
                        x2={tx}
                        y1={ry + ROW_HEIGHT - tickH}
                        y2={ry + ROW_HEIGHT}
                        stroke="currentColor"
                        className="text-slate-300 dark:text-slate-700"
                        strokeWidth={0.7}
                      />
                    )
                  })
                })}
              </g>
            )
          })}

          {/* Continuous Stepped Duty-Status Graph Line */}
          {sorted.map((seg, i) => {
            const x1 = CHART_LEFT + seg.start_hour * hourWidth
            const x2 = CHART_LEFT + seg.end_hour * hourWidth
            const y = rowY(seg.status)
            const color = ROWS.find((r) => r.key === seg.status)?.color || '#2563EB'
            const prev = sorted[i - 1]

            return (
              <g key={i}>
                {/* Vertical connector line between status changes */}
                {prev && (
                  <line
                    x1={x1}
                    x2={x1}
                    y1={rowY(prev.status)}
                    y2={y}
                    stroke={color}
                    strokeWidth={2.8}
                  />
                )}
                {/* Horizontal duty line */}
                <line
                  x1={x1}
                  x2={x2}
                  y1={y}
                  y2={y}
                  stroke={color}
                  strokeWidth={2.8}
                  strokeLinecap="square"
                />
              </g>
            )
          })}

          {/* Bottom "= 24 Hours" Verification Line */}
          <line
            x1={CHART_LEFT + CHART_WIDTH}
            x2={CHART_LEFT + CHART_WIDTH + TOTALS_WIDTH}
            y1={CHART_TOP + chartHeight}
            y2={CHART_TOP + chartHeight}
            stroke="currentColor"
            className="text-slate-400 dark:text-slate-600"
            strokeWidth={1.5}
          />
          <text
            x={CHART_LEFT + CHART_WIDTH + TOTALS_WIDTH / 2}
            y={CHART_TOP + chartHeight + 18}
            textAnchor="middle"
            fontSize="11"
            fontWeight="800"
            fill="currentColor"
            className="text-slate-900 dark:text-white font-mono"
          >
            = {totalHours.toFixed(0)}h
          </text>
        </svg>
      </div>

      {/* Remarks Section */}
      {compact ? (
        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs gap-3">
            <div className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
              <span className="font-bold text-slate-800 dark:text-slate-200 shrink-0">Remarks</span>
              <span className="text-slate-500 dark:text-slate-400 truncate text-[11px]">
                {remarksItems.length > 0 ? remarksItems.join('  •  ') : 'Routine interstate transit; no duty status exceptions.'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowAllRemarks(!showAllRemarks)}
              className="text-blue-600 dark:text-blue-400 hover:underline shrink-0 font-medium text-[11px]"
            >
              {showAllRemarks ? 'Hide Remarks' : 'View Remarks'}
            </button>
          </div>
          {showAllRemarks && (
            <div className="mt-2 space-y-1 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
              {day.segments.filter((s) => s.label).map((s, idx) => (
                <div key={idx} className="flex items-baseline gap-2">
                  <span className="font-mono text-slate-500 dark:text-slate-400 text-[11px] w-20 shrink-0">
                    {formatClock(s.start_hour)}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-tight uppercase shrink-0 ${
                    s.status === 'DRIVING' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' :
                    s.status === 'ON_DUTY_NOT_DRIVING' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300' :
                    s.status === 'SLEEPER_BERTH' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' :
                    'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}>
                    {s.status.replace(/_/g, ' ')}
                  </span>
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <span>Remarks</span>
              <span className="text-[10px] font-normal text-slate-400 normal-case">(Duty status changes, locations, and stops per § 395.8)</span>
            </h4>
            <div className="space-y-1 text-xs">
              {day.segments.filter((s) => s.label).map((s, idx) => (
                <div key={idx} className="flex items-baseline gap-2">
                  <span className="font-mono text-slate-500 dark:text-slate-400 text-[11px] w-20 shrink-0">
                    {formatClock(s.start_hour)}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-tight uppercase shrink-0 ${
                    s.status === 'DRIVING' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' :
                    s.status === 'ON_DUTY_NOT_DRIVING' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300' :
                    s.status === 'SLEEPER_BERTH' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' :
                    'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}>
                    {s.status.replace(/_/g, ' ')}
                  </span>
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recap Table (70 Hour / 8 Day Drivers) */}
          <div className="mt-5 pt-3 border-t-2 border-slate-800 dark:border-slate-700">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
              Recap: Complete at end of day (70-Hour / 8-Day Drivers)
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded border border-slate-200 dark:border-slate-800">
                <span className="block text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">On-Duty Today</span>
                <span className="text-base font-bold text-slate-900 dark:text-white mt-0.5 block">{recap.on_duty_today} hrs</span>
                <span className="text-[9px] text-slate-400 block">Lines 3 & 4</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded border border-slate-200 dark:border-slate-800">
                <span className="block text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">A. Total Past 7 Days</span>
                <span className="text-base font-bold text-slate-900 dark:text-white mt-0.5 block">{recap.total_duty_last_7_days} hrs</span>
                <span className="text-[9px] text-slate-400 block">Including today</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded border border-slate-200 dark:border-slate-800">
                <span className="block text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">B. Available Tomorrow</span>
                <span className="text-base font-bold text-green-600 dark:text-green-400 mt-0.5 block">{recap.hours_available_tomorrow} hrs</span>
                <span className="text-[9px] text-slate-400 block">70 hr. minus A*</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded border border-slate-200 dark:border-slate-800">
                <span className="block text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">C. Total 8-Day Rolling</span>
                <span className="text-base font-bold text-slate-900 dark:text-white mt-0.5 block">{recap.total_duty_last_8_days} hrs</span>
                <span className="text-[9px] text-slate-400 block">Must remain &le; 70h</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function formatHMColon(hours) {
  if (!hours || hours <= 0) return '0:00'
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return `${h}:${String(m).padStart(2, '0')}`
}

function formatClock(hourFloat) {
  const h = Math.floor(hourFloat)
  const m = Math.round((hourFloat - h) * 60)
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')} ${period}`
}

