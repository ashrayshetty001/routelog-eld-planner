import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap, ZoomControl } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const markerColors = {
  current: '#2563EB',
  pickup: '#F2913D',
  dropoff: '#0B1E39',
  fuel: '#16A34A',
  rest: '#DC2626',
}

function createCustomIcon(type, fullLabel) {
  const color = markerColors[type] || '#2563EB'
  // Clean short label for callout badge
  let labelText = fullLabel
  if (fullLabel.includes(':')) {
    labelText = fullLabel.split(':')[1].trim()
  }

  // Icon symbol inside pin
  let innerIcon = ''
  if (type === 'fuel') {
    innerIcon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M19.77 7.23l.01-.01-3.72-3.72L15 4.56l2.11 2.11c-.94.36-1.61 1.26-1.61 2.33 0 1.38 1.12 2.5 2.5 2.5.36 0 .69-.08 1-.22v5.72c0 .55-.45 1-1 1s-1-.45-1-1V14c0-1.1-.9-2-2-2h-1V5c0-1.1-.9-2-2-2H6c-1.1 0-2 .9-2 2v16h10v-7.5h1.5v5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V9c0-.69-.28-1.32-.73-1.77zM12 10H6V5h6v5zm6 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/></svg>`
  } else if (type === 'rest') {
    innerIcon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2v-9c0-2.21-1.79-4-4-4z"/></svg>`
  } else {
    innerIcon = `<div style="width:6px;height:6px;border-radius:50%;background:white;"></div>`
  }

  return L.divIcon({
    className: 'custom-map-pin',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;pointer-events:auto;">
        <div style="
          background:${color};
          color:white;
          font-size:10px;
          font-weight:700;
          padding:2px 7px;
          border-radius:9999px;
          white-space:nowrap;
          box-shadow:0 2px 6px rgba(0,0,0,0.3);
          border:1px solid rgba(255,255,255,0.4);
          margin-bottom:3px;
        ">
          ${labelText}
        </div>
        <div style="
          width:24px;
          height:24px;
          border-radius:50%;
          background:${color};
          display:flex;
          align-items:center;
          justify-content:center;
          border:2px solid white;
          box-shadow:0 2px 5px rgba(0,0,0,0.35);
        ">
          ${innerIcon}
        </div>
      </div>
    `,
    iconSize: [80, 50],
    iconAnchor: [40, 48],
  })
}

function FitBounds({ positions }) {
  const map = useMap()
  useEffect(() => {
    if (positions.length > 0) {
      map.fitBounds(positions, { padding: [50, 50] })
    }
  }, [positions, map])
  return null
}

export default function RouteMap({ geometry, markers }) {
  const [mapType, setMapType] = useState('map') // 'map' | 'satellite'
  const linePositions = geometry || []
  const allPositions = [
    ...linePositions,
    ...markers.map((m) => [m.lat, m.lon]),
  ]

  return (
    <div className="relative w-full h-full">
      {/* Top-Left Map / Satellite Toggle */}
      <div className="absolute top-3 left-3 z-[1000] bg-white dark:bg-slate-800 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 p-0.5 flex text-xs font-semibold">
        <button
          type="button"
          onClick={() => setMapType('map')}
          className={`px-3 py-1.5 rounded-md transition ${
            mapType === 'map'
              ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          Map
        </button>
        <button
          type="button"
          onClick={() => setMapType('satellite')}
          className={`px-3 py-1.5 rounded-md transition ${
            mapType === 'satellite'
              ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          Satellite
        </button>
      </div>

      <MapContainer
        center={allPositions[0] || [39.8, -98.5]}
        zoom={5}
        scrollWheelZoom
        zoomControl={false}
        className="w-full h-full rounded-xl z-0"
      >
        <ZoomControl position="bottomright" />
        {mapType === 'map' ? (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        ) : (
          <TileLayer
            attribution='&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        )}
        {linePositions.length > 0 && (
          <Polyline positions={linePositions} pathOptions={{ color: '#2563EB', weight: 4.5, opacity: 0.9 }} />
        )}
        {markers.map((m, i) => (
          <Marker
            key={i}
            position={[m.lat, m.lon]}
            icon={createCustomIcon(m.type, m.label)}
          >
            <Popup>{m.label}</Popup>
          </Marker>
        ))}
        <FitBounds positions={allPositions} />
      </MapContainer>
    </div>
  )
}
