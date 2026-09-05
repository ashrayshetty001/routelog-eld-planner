import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

export async function planTrip({ currentLocation, pickupLocation, dropoffLocation, cycleHoursUsed }) {
  const response = await axios.post(`${API_BASE_URL}/plan-trip/`, {
    current_location: currentLocation,
    pickup_location: pickupLocation,
    dropoff_location: dropoffLocation,
    current_cycle_used_hours: cycleHoursUsed,
  })
  return response.data
}
