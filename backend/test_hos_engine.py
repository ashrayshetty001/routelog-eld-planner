"""
Standalone sanity test for the HOS engine (no Django/DB needed).
Simulates a long trip requiring multiple days, breaks, and resets, then
prints the daily log breakdown so we can eyeball correctness against the
FMCSA rules before wiring up the API/frontend.
"""
from datetime import datetime
from trips.hos_engine import HOSSimulator, split_into_daily_logs

start = datetime(2024, 5, 8, 10, 30)
sim = HOSSimulator(start_time=start, cycle_hours_used=42)

sim.add_driving(2.0, label="Drive to Houston, TX (pickup)")
sim.add_on_duty(1.0, label="Pickup in Houston, TX")
sim.add_driving(6.0, label="Drive toward Del Rio, TX")
sim.add_on_duty(0.5, label="Fuel stop in Del Rio, TX")
sim.add_driving(4.0, label="Drive toward Van Horn, TX")
sim.add_driving(9.0, label="Drive to Los Angeles, CA (dropoff)")
sim.add_on_duty(1.0, label="Dropoff in Los Angeles, CA")

result = sim.finalize()

print("=== SUMMARY ===")
print("Total driving hours:", result.total_driving_hours)
print("Total on-duty hours:", result.total_on_duty_hours)
print("Used 34-hr restart:", result.used_34hr_restart)
print("Warnings:", [w.message for w in result.warnings])
print()

for seg in result.segments:
    print(f"{seg.start} -> {seg.end}  [{seg.status.value:20s}]  {seg.hours:5.2f}h  {seg.label}")

print()
print("=== DAILY LOGS ===")
logs = split_into_daily_logs(result.segments)
for day in logs:
    print(f"\n-- {day['date']} --")
    print("Totals:", day["totals"])
    for s in day["segments"]:
        print(f"  {s['start_hour']:.2f} - {s['end_hour']:.2f}  {s['status']:20s} {s['label']}")

assert len(logs) >= 1, "Should produce at least one daily log"
total_logged_hours = sum(sum(d["totals"].values()) for d in logs)
print(f"\nTotal logged hours across all days: {total_logged_hours:.2f}")
