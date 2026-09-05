"""
Verifies the full plan_trip() pipeline (geocode -> route -> HOS sim ->
daily logs) with routing/geocoding mocked out, since this sandbox can't
reach OSRM/Nominatim. Run for real locally once deployed.
"""
from unittest.mock import patch
from datetime import datetime
import json

from trips import planner

FAKE_GEOCODE = {
    "Dallas, TX": (-96.7970, 32.7767),
    "Houston, TX": (-95.3698, 29.7604),
    "Los Angeles, CA": (-118.2437, 34.0522),
}

FAKE_ROUTE = {
    "distance_miles": 1542.0,
    "duration_hours": 20.25,
    "geometry": [[32.7767, -96.7970], [29.7604, -95.3698], [34.0522, -118.2437]],
    "legs": [
        {"distance_miles": 240.0, "duration_hours": 3.5},
        {"distance_miles": 1502.0, "duration_hours": 22.0},
    ],
}

with patch("trips.planner.geocode", side_effect=lambda p: FAKE_GEOCODE[p]), \
     patch("trips.planner.osrm_route", return_value=FAKE_ROUTE):
    result = planner.plan_trip(
        current_location="Dallas, TX",
        pickup_location="Houston, TX",
        dropoff_location="Los Angeles, CA",
        cycle_hours_used=42,
        start_time=datetime(2024, 5, 8, 10, 30),
    )

print(json.dumps(result["summary"], indent=2))
print(f"\nNumber of daily logs: {len(result['daily_logs'])}")
for d in result["daily_logs"]:
    print(f"  {d['date']}: {d['totals']}")
    total_day_hrs = sum(d["totals"].values())
    assert abs(total_day_hrs - 24.0) < 1e-4, f"Day {d['date']} total must be 24.0, got {total_day_hrs}"

assert result["summary"]["total_distance_miles"] == 1542.0
assert result["summary"]["number_of_days"] >= 1
assert len(result["map"]["markers"]) >= 3, "Should include waypoints and stop markers"
print("\nAll assertions passed.")

