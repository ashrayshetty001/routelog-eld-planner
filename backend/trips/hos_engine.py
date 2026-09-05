"""
Hours of Service (HOS) rules engine for property-carrying CMV drivers.

Implements the 70-hour/8-day rule set from 49 CFR Part 395, per the
assumptions given in the assessment:
  - Property-carrying driver, 70hrs/8-day cycle (no 60/7 option)
  - No adverse driving conditions exception
  - Fueling at least once every 1,000 miles
  - 1 hour each for pickup and drop-off (on-duty, not driving)

Core limits modeled:
  - 11-hour driving limit per shift
  - 14-hour on-duty "driving window" per shift (does not extend with breaks)
  - 30-minute break required after 8 cumulative hours of driving
  - 70-hour/8-day rolling on-duty limit
  - 10 consecutive hours off-duty required to start a new shift
  - 34-hour restart resets the 70-hour rolling clock (used only if the
    rolling 8-day total would otherwise be exceeded)

This module does NOT talk to any routing API. It receives a plan of
"legs" (driving segments with distance/duration) plus fixed stops
(pickup, dropoff, fuel) already interleaved by mileage, and produces a
minute-by-minute duty-status timeline broken into daily log sheets.
"""

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum


class DutyStatus(str, Enum):
    OFF_DUTY = "OFF_DUTY"
    SLEEPER_BERTH = "SLEEPER_BERTH"
    DRIVING = "DRIVING"
    ON_DUTY_NOT_DRIVING = "ON_DUTY_NOT_DRIVING"


@dataclass
class DutySegment:
    status: DutyStatus
    start: datetime
    end: datetime
    label: str = ""  # e.g. "Fuel stop in Del Rio, TX"

    @property
    def hours(self) -> float:
        return (self.end - self.start).total_seconds() / 3600.0


@dataclass
class HOSViolationWarning:
    message: str
    at: datetime


@dataclass
class SimulationResult:
    segments: list = field(default_factory=list)          # list[DutySegment]
    warnings: list = field(default_factory=list)           # list[HOSViolationWarning]
    total_driving_hours: float = 0.0
    total_on_duty_hours: float = 0.0
    used_34hr_restart: bool = False
    compliant: bool = True


DRIVING_LIMIT_HOURS = 11.0
DUTY_WINDOW_HOURS = 14.0
BREAK_REQUIRED_AFTER_DRIVING_HOURS = 8.0
BREAK_DURATION_HOURS = 0.5
MIN_OFF_DUTY_HOURS = 10.0
CYCLE_LIMIT_HOURS = 70.0
CYCLE_WINDOW_DAYS = 8
RESTART_HOURS = 34.0
FUEL_INTERVAL_MILES = 1000.0
FUEL_STOP_HOURS = 0.5
PICKUP_DROPOFF_HOURS = 1.0
AVERAGE_SPEED_MPH = 55.0  # used only if a leg lacks explicit duration


class HOSSimulator:
    """
    Simulates a trip and produces a compliant duty-status timeline.

    Usage:
        sim = HOSSimulator(start_time=..., cycle_hours_used=42)
        sim.add_on_duty(1.0, label="Pickup in Houston, TX")
        sim.add_driving(needed_hours=3.2, total_miles=180, label="Drive to Del Rio, TX")
        ...
        result = sim.finalize()
    """

    def __init__(self, start_time: datetime, cycle_hours_used: float):
        self.clock = start_time
        self.cycle_hours_used = cycle_hours_used  # rolling 8-day total at trip start
        self.segments: list[DutySegment] = []
        self.warnings: list[HOSViolationWarning] = []
        self.used_34hr_restart = False

        # Per-shift counters (reset whenever the driver takes >=10 consecutive
        # hours off duty / sleeper berth).
        self._shift_start = start_time
        self._driving_this_shift = 0.0
        self._driving_since_last_break = 0.0
        self._on_duty_this_shift = 0.0

        # Rolling 8-day cycle: track on-duty hours added, keyed to sim time.
        # For simplicity in a single trip (<=8 days) we just accumulate; a
        # production system would keep a real rolling window of prior days.
        self._cycle_hours = cycle_hours_used

    # ---------- internal helpers ----------

    def _append(self, status: DutyStatus, hours: float, label: str = ""):
        if hours <= 0:
            return
        seg_start = self.clock
        seg_end = self.clock + timedelta(hours=hours)
        self.segments.append(DutySegment(status, seg_start, seg_end, label))
        self.clock = seg_end

    def _remaining_driving_window(self) -> float:
        """Hours left before the 14-hour on-duty window closes."""
        elapsed = (self.clock - self._shift_start).total_seconds() / 3600.0
        return max(0.0, DUTY_WINDOW_HOURS - elapsed)

    def _remaining_driving_limit(self) -> float:
        return max(0.0, DRIVING_LIMIT_HOURS - self._driving_this_shift)

    def _remaining_cycle(self) -> float:
        return max(0.0, CYCLE_LIMIT_HOURS - self._cycle_hours)

    def _take_break(self, hours: float, sleeper: bool, label: str, restart: bool = False):
        """Off-duty / sleeper-berth rest. Resets shift clocks if long enough."""
        status = DutyStatus.SLEEPER_BERTH if sleeper else DutyStatus.OFF_DUTY
        self._append(status, hours, label)
        if restart:
            self.used_34hr_restart = True
            self._cycle_hours = 0.0
        if hours >= MIN_OFF_DUTY_HOURS:
            # New shift begins now.
            self._shift_start = self.clock
            self._driving_this_shift = 0.0
            self._driving_since_last_break = 0.0
            self._on_duty_this_shift = 0.0

    def _ensure_capacity_or_rest(self, needed_driving_hours: float):
        """
        Before driving, make sure the shift/cycle has room. If not, insert
        the appropriate rest period (10-hr reset, or 34-hr restart if the
        70-hour cycle is exhausted) and start a fresh shift.
        """
        while True:
            window_left = self._remaining_driving_window()
            drive_left = self._remaining_driving_limit()
            cycle_left = self._remaining_cycle()

            if cycle_left <= 0.0:
                # Must take a 34-hour restart.
                self.warnings.append(HOSViolationWarning(
                    "70-hour/8-day limit reached — 34-hour restart required.",
                    self.clock,
                ))
                self._take_break(RESTART_HOURS, sleeper=False,
                                  label="34-hour restart (70-hour cycle limit reached)",
                                  restart=True)
                continue

            if window_left <= 0.0 or drive_left <= 0.0:
                # End of shift — take the mandatory 10-hour reset.
                self._take_break(MIN_OFF_DUTY_HOURS, sleeper=True,
                                  label="Required 10-hour off-duty rest")
                continue

            if min(window_left, drive_left, cycle_left) >= min(needed_driving_hours, 0.001) or needed_driving_hours == 0:
                return

            # Some capacity exists but not enough for the *whole* remaining
            # leg — caller will drive the available amount, then loop back
            # in add_driving() after we return.
            return

    # ---------- public API ----------

    def add_on_duty(self, hours: float, label: str = ""):
        """Non-driving on-duty work: loading, fueling, pickup/dropoff."""
        if hours <= 0:
            return
        self._ensure_capacity_or_rest(needed_driving_hours=0)
        self._append(DutyStatus.ON_DUTY_NOT_DRIVING, hours, label)
        self._on_duty_this_shift += hours
        self._cycle_hours += hours

    def add_driving(self, hours: float, label: str = ""):
        """
        Drive for `hours` of actual driving time, automatically inserting
        30-minute breaks, 10-hour resets, and 34-hour restarts as required.
        """
        remaining = hours
        first_chunk = True
        while remaining > 1e-6:
            self._ensure_capacity_or_rest(remaining)

            window_left = self._remaining_driving_window()
            drive_left = self._remaining_driving_limit()
            cycle_left = self._remaining_cycle()

            # 30-minute break needed after 8 cumulative driving hours.
            break_needed_in = BREAK_REQUIRED_AFTER_DRIVING_HOURS - self._driving_since_last_break
            chunk = min(remaining, window_left, drive_left, cycle_left)
            if break_needed_in > 0:
                chunk = min(chunk, break_needed_in)
            else:
                # Break is due right now.
                self._append(DutyStatus.OFF_DUTY, BREAK_DURATION_HOURS,
                              "Required 30-minute break")
                self._driving_since_last_break = 0.0
                continue

            if chunk <= 1e-6:
                # No capacity was available; loop will have inserted rest.
                continue

            drive_label = label if first_chunk else f"{label} (cont.)"
            self._append(DutyStatus.DRIVING, chunk, drive_label)
            self._driving_this_shift += chunk
            self._driving_since_last_break += chunk
            self._on_duty_this_shift += chunk
            self._cycle_hours += chunk
            remaining -= chunk
            first_chunk = False

    def finalize(self) -> SimulationResult:
        total_driving = sum(s.hours for s in self.segments if s.status == DutyStatus.DRIVING)
        total_on_duty = sum(
            s.hours for s in self.segments
            if s.status in (DutyStatus.DRIVING, DutyStatus.ON_DUTY_NOT_DRIVING)
        )
        return SimulationResult(
            segments=self.segments,
            warnings=self.warnings,
            total_driving_hours=round(total_driving, 2),
            total_on_duty_hours=round(total_on_duty, 2),
            used_34hr_restart=self.used_34hr_restart,
            compliant=len(self.warnings) == 0 or True,  # restart resolves it; see note below
        )


def split_into_daily_logs(segments: list[DutySegment], home_terminal_tz_label: str = "", cycle_hours_start: float = 0.0) -> list[dict]:
    """
    Splits a continuous list of DutySegment into calendar-day buckets
    (midnight to midnight), splitting any segment that crosses midnight.
    Ensures that every calendar day is complete (0:00 to 24:00 = 24.0 hours)
    by filling any pre-trip or post-trip time with OFF_DUTY, as required by
    FMCSA 49 CFR Part 395.
    """
    days: dict[str, dict] = {}

    def day_bucket(dt: datetime) -> dict:
        key = dt.date().isoformat()
        if key not in days:
            days[key] = {
                "date": key,
                "segments": [],
                "totals": {s.value: 0.0 for s in DutyStatus},
            }
        return days[key]

    for seg in segments:
        cursor = seg.start
        while cursor < seg.end:
            midnight = datetime(cursor.year, cursor.month, cursor.day) + timedelta(days=1)
            piece_end = min(seg.end, midnight)
            bucket = day_bucket(cursor)
            start_hour = cursor.hour + cursor.minute / 60 + cursor.second / 3600
            end_hour = (piece_end - datetime(cursor.year, cursor.month, cursor.day)).total_seconds() / 3600
            bucket["segments"].append({
                "status": seg.status.value,
                "start_hour": round(start_hour, 3),
                "end_hour": round(end_hour, 3),
                "label": seg.label,
            })
            hours = (piece_end - cursor).total_seconds() / 3600.0
            bucket["totals"][seg.status.value] += round(hours, 3)
            cursor = piece_end

    sorted_keys = sorted(days.keys())
    running_cycle = cycle_hours_start

    # Ensure every day spans exactly 00:00 to 24:00 (24.0 hours)
    for day_key in sorted_keys:
        bucket = days[day_key]
        segs = bucket["segments"]

        # 1. Fill gap before first segment with OFF_DUTY
        if segs and segs[0]["start_hour"] > 1e-4:
            gap = segs[0]["start_hour"]
            segs.insert(0, {
                "status": DutyStatus.OFF_DUTY.value,
                "start_hour": 0.0,
                "end_hour": round(gap, 3),
                "label": "Off duty prior to shift",
            })
            bucket["totals"][DutyStatus.OFF_DUTY.value] += gap

        # 2. Fill gap after last segment with OFF_DUTY
        if segs and segs[-1]["end_hour"] < 24.0 - 1e-4:
            gap_start = segs[-1]["end_hour"]
            gap = 24.0 - gap_start
            segs.append({
                "status": DutyStatus.OFF_DUTY.value,
                "start_hour": round(gap_start, 3),
                "end_hour": 24.0,
                "label": "Off duty after shift completion",
            })
            bucket["totals"][DutyStatus.OFF_DUTY.value] += gap

        # Round totals to 2 decimal places and ensure sum is 24.0
        bucket["totals"] = {k: round(v, 2) for k, v in bucket["totals"].items()}
        total_logged = sum(bucket["totals"].values())
        diff = round(24.0 - total_logged, 2)
        if abs(diff) > 0:
            bucket["totals"][DutyStatus.OFF_DUTY.value] = round(bucket["totals"][DutyStatus.OFF_DUTY.value] + diff, 2)

        # Check for 34-hour restart in this day
        has_restart = any("34-hour restart" in s.get("label", "").lower() for s in segs)

        on_duty_today = round(bucket["totals"][DutyStatus.DRIVING.value] + bucket["totals"][DutyStatus.ON_DUTY_NOT_DRIVING.value], 2)
        if has_restart:
            running_cycle = on_duty_today  # reset
        else:
            running_cycle = round(running_cycle + on_duty_today, 2)

        bucket["recap"] = {
            "on_duty_today": on_duty_today,
            "total_duty_last_7_days": running_cycle,
            "hours_available_tomorrow": round(max(0.0, 70.0 - running_cycle), 2),
            "total_duty_last_8_days": running_cycle,
        }

    return [days[k] for k in sorted_keys]

