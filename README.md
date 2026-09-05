# RouteLog — Trucking ELD Trip Planner

A full-stack app that takes a trip (current location, pickup, dropoff,
current 70-hour/8-day cycle hours used) and returns:

- An HOS-compliant route plan (driving legs, fuel stops, rest breaks)
- An interactive map of the route
- Auto-generated FMCSA-style Daily Log Sheets, one per day of the trip

Built with **Django + Django REST Framework** (backend) and **React + Vite +
Tailwind CSS** (frontend).

## Architecture

```
backend/
  trips/
    hos_engine.py   <- Core HOS rules engine (49 CFR Part 395, 70hr/8day)
    routing.py      <- Free geocoding (Nominatim) + routing (OSRM)
    planner.py      <- Orchestrates routing + HOS simulation
    views.py        <- POST /api/plan-trip/
frontend/
  src/
    components/
      TripInputForm.jsx     <- Screen 1: trip input
      ResultsDashboard.jsx  <- Screen 2: map + stats + daily logs
      DailyLogSheet.jsx     <- SVG renderer for one FMCSA log grid
      RouteMap.jsx          <- Leaflet map with route + stop markers
```

### HOS rules implemented (assumptions per assessment spec)

- Property-carrying driver, **70-hour/8-day** cycle (not 60/7)
- No adverse driving conditions exception
- 11-hour driving limit per shift
- 14-hour on-duty window per shift
- 30-minute break required after 8 cumulative hours of driving
- 10 consecutive hours off-duty to reset the shift clocks
- 34-hour restart when the rolling 70-hour cycle is exhausted
- Fuel stop every 1,000 miles (30 min)
- 1 hour on-duty for pickup and 1 hour for dropoff

See `backend/trips/hos_engine.py` for the full implementation and comments
tying each rule back to its CFR section.

## Running locally

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver      # http://localhost:8000
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env            # points at http://localhost:8000/api
npm run dev                     # http://localhost:5173
```

Open `http://localhost:5173`, fill in the trip form, and submit.

## Testing the HOS engine directly

Two standalone scripts validate the engine without needing the DB or a
live network call (useful since routing APIs require internet access):

```bash
cd backend
source venv/bin/activate
python test_hos_engine.py        # exercises the raw simulator
python test_planner_mocked.py    # exercises the full pipeline w/ mocked routing
```

## Deployment

- **Frontend**: deploy `frontend/` to Vercel. Set `VITE_API_BASE_URL` to
  your deployed backend's `/api` URL in Vercel's environment variables.
- **Backend**: deploy `backend/` to Render/Railway (free tiers work).
  Set `DEBUG=False`, a real `SECRET_KEY`, and `ALLOWED_HOSTS` in
  production; add `gunicorn config.wsgi` as the start command.

## Notes / things to mention in the Loom walkthrough

- The routing/geocoding layer uses **free, keyless APIs** (OpenStreetMap
  Nominatim for geocoding, the public OSRM demo server for routing) so
  the app runs with zero API keys. For production you'd swap in
  Mapbox/ORS with a key, add caching, and handle their rate limits.
- The HOS engine models a *single continuous trip* against the 70/8
  rule; it doesn't yet account for on-duty hours from days *before* the
  trip starts beyond the single `cycle_hours_used` input, which matches
  the assessment's stated inputs.
- The dashboard shows a distinct **non-compliant / 34-hour-restart
  banner** state when the simulation has to insert a restart, so the UI
  clearly communicates *why* a trip took longer than the naive driving
  time would suggest.
