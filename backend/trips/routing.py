"""
Routing + geocoding via free, no-API-key services:
  - Geocoding: OpenStreetMap Nominatim
  - Routing:   OSRM public demo server (http://router.project-osrm.org)

For a production deployment you'd swap in Mapbox/ORS with an API key and
add caching + rate-limit handling, but these free services are enough for
the assessment's scope and keep the app dependency-free of paid keys.
"""

import requests

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
OSRM_ROUTE_URL = "http://router.project-osrm.org/route/v1/driving/{coords}"

HEADERS = {"User-Agent": "RouteLog-ELD-Planner/1.0 (assessment project)"}


class RoutingError(Exception):
    pass


def geocode(place: str) -> tuple[float, float]:
    """Returns (lon, lat) for a place name/address."""
    resp = requests.get(
        NOMINATIM_URL,
        params={"q": place, "format": "json", "limit": 1},
        headers=HEADERS,
        timeout=10,
    )
    resp.raise_for_status()
    data = resp.json()
    if not data:
        raise RoutingError(f"Could not geocode location: {place!r}")
    return float(data[0]["lon"]), float(data[0]["lat"])


def route(waypoints: list[tuple[float, float]]) -> dict:
    """
    waypoints: list of (lon, lat) tuples, in order.
    Returns: {
      "distance_miles": float,
      "duration_hours": float,
      "geometry": [[lat, lon], ...],   # for map rendering
      "legs": [ {"distance_miles": f, "duration_hours": f}, ... ]  # per waypoint-pair
    }
    """
    coords = ";".join(f"{lon},{lat}" for lon, lat in waypoints)
    url = OSRM_ROUTE_URL.format(coords=coords)
    resp = requests.get(
        url,
        params={"overview": "full", "geometries": "geojson"},
        headers=HEADERS,
        timeout=20,
    )
    resp.raise_for_status()
    data = resp.json()
    if data.get("code") != "Ok" or not data.get("routes"):
        raise RoutingError(f"Routing failed: {data.get('message', 'unknown error')}")

    r = data["routes"][0]
    geometry = [[lat, lon] for lon, lat in r["geometry"]["coordinates"]]
    legs = [
        {
            "distance_miles": leg["distance"] / 1609.34,
            "duration_hours": leg["duration"] / 3600.0,
        }
        for leg in r["legs"]
    ]
    return {
        "distance_miles": r["distance"] / 1609.34,
        "duration_hours": r["duration"] / 3600.0,
        "geometry": geometry,
        "legs": legs,
    }
