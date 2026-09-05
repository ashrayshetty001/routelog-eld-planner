"""
Orchestrates: geocode inputs -> get route legs -> run HOS simulation ->
package results (map data + daily logs + summary) for the API response.
"""

from datetime import datetime

from .hos_engine import (
    HOSSimulator,
    split_into_daily_logs,
    FUEL_INTERVAL_MILES,
    FUEL_STOP_HOURS,
    PICKUP_DROPOFF_HOURS,
)
from .routing import geocode, route as osrm_route


def plan_trip(current_location: str, pickup_location: str,
              dropoff_location: str, cycle_hours_used: float,
              start_time: datetime | None = None) -> dict:
    start_time = start_time or datetime.now().replace(second=0, microsecond=0)

    # 1. Geocode all three points.
    current_coord = geocode(current_location)
    pickup_coord = geocode(pickup_location)
    dropoff_coord = geocode(dropoff_location)

    # 2. Route: current -> pickup -> dropoff (two legs).
    r = osrm_route([current_coord, pickup_coord, dropoff_coord])
    leg_to_pickup, leg_to_dropoff = r["legs"][0], r["legs"][1]

    # 3. Build the ordered list of "stops" with fuel stops inserted every
    #    1,000 miles across the whole trip, respecting the leg boundaries.
    stops = _build_stop_plan(leg_to_pickup, leg_to_dropoff,
                              current_location, pickup_location, dropoff_location)

    # 4. Run the HOS simulation across the stop plan.
    sim = HOSSimulator(start_time=start_time, cycle_hours_used=cycle_hours_used)
    trip_stops_summary = []

    for stop in stops:
        if stop["type"] == "drive":
            sim.add_driving(stop["hours"], label=stop["label"])
        else:
            sim.add_on_duty(stop["hours"], label=stop["label"])
            trip_stops_summary.append({
                "type": stop["type"],
                "location": stop["location"],
                "duration_hours": stop["hours"],
                "arrived_at": sim.clock.isoformat(),
            })

    result = sim.finalize()
    daily_logs = split_into_daily_logs(result.segments, cycle_hours_start=cycle_hours_used)

    # Build comprehensive trip stops summary including rests and fuels
    trip_stops_summary = []
    for s in result.segments:
        lbl = s.label.lower()
        if "pickup" in lbl:
            trip_stops_summary.append({
                "type": "Pickup",
                "location": pickup_location,
                "duration_hours": s.hours,
                "arrived_at": s.start.isoformat(),
            })
        elif "fuel" in lbl:
            trip_stops_summary.append({
                "type": "Fuel",
                "location": "Fuel Station",
                "duration_hours": s.hours,
                "arrived_at": s.start.isoformat(),
            })
        elif s.hours >= 8.0 and ("rest" in lbl or "sleeper" in lbl or "restart" in lbl):
            trip_stops_summary.append({
                "type": "Rest",
                "location": "Rest Area",
                "duration_hours": s.hours,
                "arrived_at": s.start.isoformat(),
            })
        elif "dropoff" in lbl:
            trip_stops_summary.append({
                "type": "Dropoff",
                "location": dropoff_location,
                "duration_hours": s.hours,
                "arrived_at": s.start.isoformat(),
            })

    num_days = len(daily_logs)
    compliant = len(result.warnings) == 0 and not result.used_34hr_restart

    # Calculate stop coordinates along route geometry for map markers
    geom = r.get("geometry", [])
    total_driving_h = result.total_driving_hours or 1.0
    driven_h = 0.0

    markers = [
        {"type": "current", "label": f"Start: {current_location}", "lat": current_coord[1], "lon": current_coord[0]},
        {"type": "pickup", "label": f"Pickup: {pickup_location}", "lat": pickup_coord[1], "lon": pickup_coord[0]},
        {"type": "dropoff", "label": f"Dropoff: {dropoff_location}", "lat": dropoff_coord[1], "lon": dropoff_coord[0]},
    ]

    if geom and len(geom) > 1:
        for s in result.segments:
            if s.status.value == "DRIVING":
                driven_h += s.hours
            elif "fuel" in s.label.lower():
                ratio = min(0.99, max(0.01, driven_h / total_driving_h))
                idx = int(ratio * (len(geom) - 1))
                lat, lon = geom[idx]
                markers.append({
                    "type": "fuel",
                    "label": f"Fuel Stop (30m): {s.label}",
                    "lat": lat,
                    "lon": lon,
                })
            elif "rest" in s.label.lower() or "sleeper" in s.label.lower() or "restart" in s.label.lower():
                if s.hours >= 8.0:  # 10hr reset or 34hr restart
                    ratio = min(0.99, max(0.01, driven_h / total_driving_h))
                    idx = int(ratio * (len(geom) - 1))
                    lat, lon = geom[idx]
                    label = "34-Hour Restart" if s.hours >= 34.0 else f"10-Hour Rest ({s.hours:g}h)"
                    markers.append({
                        "type": "rest",
                        "label": f"{label}: {s.start.strftime('%b %d, %I:%M %p')}",
                        "lat": lat,
                        "lon": lon,
                    })

    return {
        "trip": {
            "trip_id": f"TRP-{start_time.strftime('%Y-%m%d')}",
            "current_location": current_location,
            "pickup_location": pickup_location,
            "dropoff_location": dropoff_location,
            "start_time": start_time.isoformat(),
            "cycle_hours_used_input": cycle_hours_used,
        },
        "summary": {
            "total_distance_miles": round(r["distance_miles"], 1),
            "total_driving_hours": result.total_driving_hours,
            "total_on_duty_hours": result.total_on_duty_hours,
            "number_of_days": num_days,
            "cycle_hours_used_at_end": round(cycle_hours_used + result.total_on_duty_hours, 2),
            "cycle_hours_remaining": round(max(0.0, 70 - (cycle_hours_used + result.total_on_duty_hours)), 2),
            "used_34hr_restart": result.used_34hr_restart,
            "compliant": compliant,
            "warnings": [{"message": w.message, "at": w.at.isoformat()} for w in result.warnings],
        },
        "map": {
            "geometry": r["geometry"],
            "markers": markers,
        },
        "trip_stops": trip_stops_summary,
        "daily_logs": daily_logs,
    }



def _build_stop_plan(leg_to_pickup: dict, leg_to_dropoff: dict,
                      current_location: str, pickup_location: str,
                      dropoff_location: str) -> list[dict]:
    """
    Produces an ordered list of drive/stop actions, inserting a fuel stop
    every FUEL_INTERVAL_MILES of cumulative driving distance and a 1-hour
    on-duty block at pickup and dropoff.
    """
    plan = []
    cumulative_miles = 0.0

    def add_drive_leg(distance_miles: float, duration_hours: float, dest_label: str):
        nonlocal cumulative_miles
        remaining_miles = distance_miles
        remaining_hours = duration_hours
        while remaining_miles > 0:
            miles_to_next_fuel = FUEL_INTERVAL_MILES - (cumulative_miles % FUEL_INTERVAL_MILES)
            chunk_miles = min(remaining_miles, miles_to_next_fuel)
            chunk_hours = duration_hours * (chunk_miles / distance_miles) if distance_miles else 0
            plan.append({"type": "drive", "hours": chunk_hours,
                         "label": f"Drive toward {dest_label}"})
            cumulative_miles += chunk_miles
            remaining_miles -= chunk_miles
            remaining_hours -= chunk_hours
            if remaining_miles > 1e-6 and abs(cumulative_miles % FUEL_INTERVAL_MILES) < 1e-6:
                plan.append({"type": "fuel", "hours": FUEL_STOP_HOURS,
                             "location": "En route", "label": "Fuel stop (every 1,000 mi)"})

    add_drive_leg(leg_to_pickup["distance_miles"], leg_to_pickup["duration_hours"], pickup_location)
    plan.append({"type": "pickup", "hours": PICKUP_DROPOFF_HOURS,
                 "location": pickup_location, "label": f"Pickup in {pickup_location}"})
    add_drive_leg(leg_to_dropoff["distance_miles"], leg_to_dropoff["duration_hours"], dropoff_location)
    plan.append({"type": "dropoff", "hours": PICKUP_DROPOFF_HOURS,
                 "location": dropoff_location, "label": f"Dropoff in {dropoff_location}"})

    return plan
