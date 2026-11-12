import { Navigate, NavLink, Outlet } from 'react-router'
import { useAppSettings } from '../queries/app.js'
import { useReviewStats } from '../queries/review.js'

const NAV = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/reader', label: 'Reader' },
  { to: '/review', label: 'Review', badge: true },
  { to: '/practice', label: 'Practice' },
  { to: '/words', label: 'Words' },
  { to: '/kana', label: 'Kana' },
  { to: '/stats', label: 'Statistics' },
  { to: '/settings', label: 'Settings' },
  { to: '/about', label: 'About' },
]

export default function Layout() {
  const settings = useAppSettings()
  const { data: stats } = useReviewStats()
  const reviewCount = stats ? stats.due + stats.newToday : 0

  if (settings.isPending) return null
  // First launch: set level and daily goal before anything else.
  if (settings.data && !settings.data.onboarded) return <Navigate to="/welcome" replace />

  return (
    <div className="flex h-full">
      <nav className="flex w-48 shrink-0 flex-col gap-1 overflow-y-auto border-r border-line bg-panel p-3" aria-label="Main">
        <div className="mb-4 px-3 pt-2">
          <div className="text-lg font-bold">JapanLearn</div>
          <div className="text-xs text-muted">Read first, memorize later</div>
        </div>
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center justify-between rounded-lg px-3 py-2 text-sm ${isActive ? 'bg-accent-soft font-medium text-accent' : 'text-muted hover:text-ink'}`
            }
          >
            {item.label}
            {item.badge && reviewCount > 0 && (
              <span className="rounded-full bg-accent px-1.5 text-xs font-medium tabular-nums text-white dark:text-black" aria-label={`${reviewCount} to review`}>
                {reviewCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
