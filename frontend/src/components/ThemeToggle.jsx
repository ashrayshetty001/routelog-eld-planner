import { useTheme } from '../ThemeContext'

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={isDark ? 'text-slate-400' : 'text-slate-700 font-medium'}>
        ☀ Light
      </span>
      <button
        role="switch"
        aria-checked={isDark}
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        className={`relative w-11 h-6 rounded-full transition-colors ${isDark ? 'bg-amber' : 'bg-slate-300'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
            isDark ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
      <span className={isDark ? 'text-amber font-medium' : 'text-slate-400'}>
        Dark
      </span>
    </div>
  )
}
