# RouteLog — Trucking ELD Trip Planner & HOS Engine

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue?logo=python)](https://www.python.org/)
[![Django](https://img.shields.io/badge/Django-5.x-green?logo=django)](https://www.djangoproject.com/)
[![React](https://img.shields.io/badge/React-19.x-61DAFB?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.x-purple?logo=vite)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![FMCSA Compliance](https://img.shields.io/badge/FMCSA-49%20CFR%20§%20395-orange)](https://www.fmcsa.dot.gov/regulations/hours-of-service)

**RouteLog** is a full-stack commercial vehicle dispatching and electronic logging device (ELD) trip planner. Given a driver's current location, pickup point, dropoff destination, and prior rolling cycle duty hours, RouteLog calculates an optimal, legal route schedule strictly adhering to the **Federal Motor Carrier Safety Administration (FMCSA) 49 CFR Part 395 (Hours of Service - HOS)** regulations for property-carrying commercial motor vehicles (CMVs) under the **70-hour / 8-day rule**.

---

## Features

- **Automated HOS Compliance Engine**: Accurately simulates shift clocks, driving windows, mandatory rest breaks, and cumulative cycle limits.
- **Interactive Dual-Layer Route Map**: Leaflet map featuring real-time switching between **Map (OpenStreetMap)** and **Satellite (Esri World Imagery)** with custom styled waypoints and city callout badges.
- **Authentic FMCSA 24-Hour Daily Log Sheets**: Dynamic SVG graph grids with quarter-hour resolution for each calendar day of the trip, summing to **exactly 24.0 hours per day**, complete with duty status change remarks and 70-hour / 8-day recap tables.
- **Official Print & PDF Export**: One-click print-ready official FMCSA daily log sheet certificate format.
- **JSON Data Export**: Full structured trip payload export for fleet management systems.
- **Full Light & Dark Theme**: Custom responsive UI built with Tailwind CSS.
- **Zero API Key Dependency**: Fully functional out of the box using keyless OpenStreetMap Nominatim for geocoding and the public OSRM engine for routing.

---

## Architecture Overview

```
routelog-eld-planner/
├── backend/
│   ├── config/              # Django settings, WSGI/ASGI configuration
│   ├── trips/
│   │   ├── hos_engine.py    # Core FMCSA HOS rules engine (49 CFR § 395)
│   │   ├── routing.py       # Free geocoding (Nominatim) + routing (OSRM)
│   │   ├── planner.py       # Pipeline: Geocode -> Route -> Interleave Stops -> HOS Simulation -> Daily Logs
│   │   ├── serializers.py   # DRF Request/Response validation
│   │   ├── views.py         # POST /api/plan-trip/ endpoint
│   │   └── urls.py          # API route definitions
│   ├── test_hos_engine.py   # Standalone deterministic simulator validation
│   ├── test_planner_mocked.py # Pipeline integration test with mocked routing
│   └── requirements.txt     # Python backend dependencies
│
├── frontend/
│   ├── src/
│   │   ├── api/tripApi.js   # Axios client for backend API communication
│   │   ├── assets/          # Brand logos, vehicle hero graphics, icons
│   │   ├── components/
│   │   │   ├── TripInputForm.jsx     # Screen 1: Trip parameters input & validation
│   │   │   ├── ResultsDashboard.jsx  # Screen 2: Route KPIs, Map, Sidebar, and Log Manager
│   │   │   ├── DailyLogSheet.jsx     # SVG renderer for 24h FMCSA log grid + modal view
│   │   │   ├── RouteMap.jsx          # Leaflet map with Map/Satellite switch & custom pins
│   │   │   ├── HeroIllustration.jsx  # Responsive vehicle showcase
│   │   │   └── ThemeToggle.jsx       # Light / Dark theme switch
│   │   ├── ThemeContext.jsx # Global dark/light theme state provider
│   │   └── index.css        # Tailwind CSS styles & typography
│   └── package.json         # React & frontend tooling dependencies
└── README.md
```

---

## FMCSA Hours of Service (HOS) Rules Implemented

| Rule | CFR Section | Implementation Details |
| :--- | :--- | :--- |
| **11-Hour Driving Limit** | 49 CFR § 395.3(a)(3) | Driver may drive a maximum of 11 cumulative hours after 10 consecutive hours off duty. |
| **14-Hour Driving Window** | 49 CFR § 395.3(a)(2) | Driving prohibited after the 14th consecutive hour of coming on duty. Window does not pause for short breaks. |
| **30-Minute Rest Break** | 49 CFR § 395.3(a)(3)(ii) | Mandatory 30-minute off-duty break required after 8 cumulative hours of driving. |
| **10-Hour Shift Reset** | 49 CFR § 395.1(g) | 10 consecutive hours of off-duty / sleeper berth time required between shifts to reset the 11h and 14h clocks. |
| **70-Hour / 8-Day Limit** | 49 CFR § 395.3(b) | Total on-duty time cannot exceed 70 hours in any rolling 8-day window. |
| **34-Hour Restart** | 49 CFR § 395.3(c) | If the 70-hour cycle limit is reached, a 34 consecutive hour off-duty period resets the cycle clock to 0. |
| **Loading / Unloading** | Operational Spec | 1 hour of On-Duty (not driving) allocated at pickup; 1 hour allocated at dropoff. |
| **Fuel Stops** | Operational Spec | 30-minute fuel stop automatically scheduled every 1,000 miles of driving distance. |

---

## Running Locally

### 1. Prerequisites
- Python 3.10 or higher
- Node.js 18 or higher & npm

### 2. Backend Setup (Django REST Framework)

```powershell
cd backend

# Create and activate virtual environment
python -m venv venv

# Windows PowerShell:
.\venv\Scripts\python.exe -m pip install --upgrade pip
.\venv\Scripts\python.exe -m pip install -r requirements.txt
.\venv\Scripts\python.exe manage.py migrate
.\venv\Scripts\python.exe manage.py runserver 8000
```
*Backend server will start at: `http://localhost:8000`*

> **Note for Windows Users**: If activating with `venv\Scripts\activate` fails due to PowerShell ExecutionPolicy, use `.\venv\Scripts\python.exe manage.py runserver` or run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` first.

### 3. Frontend Setup (React + Vite + Tailwind CSS)

Open a separate terminal window:

```powershell
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
*Frontend will start at: `http://localhost:5173`*

---

## Verification & Automated Tests

The repository includes two standalone test suites that validate the HOS engine and pipeline deterministically without requiring network access:

```powershell
cd backend

# 1. Test raw HOS simulator calculations (11h drive, 14h window, 30m break, 10h resets):
.\venv\Scripts\python.exe test_hos_engine.py

# 2. Test full end-to-end trip planning pipeline with mocked routing:
.\venv\Scripts\python.exe test_planner_mocked.py
```

### Test Data Scenarios to Try in UI

#### **Scenario A: Standard Cross-Country Trip (Matches Mockup)**
- **Current Location**: `Dallas, TX`
- **Pickup Location**: `Houston, TX`
- **Dropoff Location**: `Los Angeles, CA`
- **Current Cycle Used**: `42` hrs
- **Expected Outcome**:
  - Distance: ~1,542 miles
  - Total Drive Time: ~31h 20m (Driving: ~20h 15m)
  - Number of Days: 3 Days
  - Stops: Houston, TX (Pickup), Del Rio, TX (Fuel), Van Horn, TX (Rest), Los Angeles, CA (Dropoff)
  - Daily log grids summing to exactly 24.0h per day.

#### **Scenario B: 34-Hour Restart Trigger (Edge Case)**
- **Current Location**: `Dallas, TX`
- **Pickup Location**: `Houston, TX`
- **Dropoff Location**: `Los Angeles, CA`
- **Current Cycle Used**: `65` hrs
- **Expected Outcome**: The engine detects that the rolling 70-hour cycle will be breached, automatically scheduling a **34-hour restart** and displaying an HOS notification banner.

---

## API Documentation

### `POST /api/plan-trip/`

Plans a trip and returns the compliant itinerary, route coordinates, summary metrics, and 24-hour daily log sheets.

#### Request Body:
```json
{
  "current_location": "Dallas, TX",
  "pickup_location": "Houston, TX",
  "dropoff_location": "Los Angeles, CA",
  "current_cycle_used_hours": 42.0
}
```

#### Response Structure:
```json
{
  "trip": {
    "trip_id": "TRP-2024-0508",
    "current_location": "Dallas, TX",
    "pickup_location": "Houston, TX",
    "dropoff_location": "Los Angeles, CA",
    "start_time": "2024-05-08T10:30:00",
    "cycle_hours_used_input": 42.0
  },
  "summary": {
    "total_distance_miles": 1542.0,
    "total_driving_hours": 20.25,
    "total_on_duty_hours": 22.75,
    "number_of_days": 3,
    "cycle_hours_used_at_end": 64.75,
    "cycle_hours_remaining": 5.25,
    "used_34hr_restart": false,
    "compliant": true,
    "warnings": []
  },
  "map": {
    "geometry": [[32.7767, -96.7970], ...],
    "markers": [
      { "type": "current", "label": "Start: Dallas, TX", "lat": 32.7767, "lon": -96.7970 },
      { "type": "pickup", "label": "Pickup: Houston, TX", "lat": 29.7604, "lon": -95.3698 },
      { "type": "fuel", "label": "Fuel Stop (30m): Del Rio, TX", "lat": 29.3627, "lon": -100.8968 },
      { "type": "rest", "label": "10-Hour Rest (10h): Van Horn, TX", "lat": 31.0399, "lon": -104.8308 },
      { "type": "dropoff", "label": "Dropoff: Los Angeles, CA", "lat": 34.0522, "lon": -118.2437 }
    ]
  },
  "trip_stops": [ ... ],
  "daily_logs": [
    {
      "date": "2024-05-08",
      "totals": {
        "OFF_DUTY": 10.0,
        "SLEEPER_BERTH": 8.75,
        "DRIVING": 10.25,
        "ON_DUTY_NOT_DRIVING": 3.5
      },
      "segments": [ ... ],
      "recap": {
        "on_duty_today": 13.75,
        "total_duty_last_7_days": 55.75,
        "hours_available_tomorrow": 14.25,
        "total_duty_last_8_days": 55.75
      }
    }
  ]
}
```

---

## Deployment Instructions

### Deploy Frontend to Vercel
1. Push this repository to GitHub.
2. Sign in to [Vercel](https://vercel.com) and click **Add New Project**.
3. Import your `routelog-eld-planner` repository.
4. Set **Root Directory** to `frontend`.
5. Under **Environment Variables**, add:
   - `VITE_API_BASE_URL` = `https://your-backend-api.onrender.com/api`
6. Click **Deploy**.

### Deploy Backend to Render
1. Sign in to [Render](https://render.com) and create a **New Web Service**.
2. Select your repository and configure:
   - **Root Directory**: `backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt && python manage.py migrate`
   - **Start Command**: `gunicorn config.wsgi:application`
3. In **Environment Variables**, add:
   - `DEBUG` = `False`
   - `SECRET_KEY` = `<your-random-secret-key>`
   - `ALLOWED_HOSTS` = `*` (or your specific domain)
4. Deploy the service.

---

## Author
Developed by **Ashray Shetty** as part of the Full Stack Developer Technical Assessment for **Spotter AI**.
