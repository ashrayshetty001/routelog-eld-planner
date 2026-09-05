import { useState } from 'react'
import TripInputForm from './components/TripInputForm'
import ResultsDashboard from './components/ResultsDashboard'
import { planTrip } from './api/tripApi'
import { ThemeProvider } from './ThemeContext'

function AppInner() {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (formData) => {
    setLoading(true)
    setError('')
    try {
      const data = await planTrip(formData)
      setResult(data)
    } catch (err) {
      setError(
        err?.response?.data?.error ||
        'Something went wrong planning this trip. Check the locations and try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  if (result) {
    return <ResultsDashboard result={result} onBack={() => setResult(null)} />
  }

  return (
    <>
      <TripInputForm onSubmit={handleSubmit} loading={loading} />
      {error && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-red-600 text-white text-sm px-4 py-3 rounded-lg shadow-lg">
          {error}
        </div>
      )}
    </>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  )
}
