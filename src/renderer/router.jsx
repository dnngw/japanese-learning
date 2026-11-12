import { createHashRouter } from 'react-router'
import About from './views/About.jsx'
import Dashboard from './views/Dashboard.jsx'
import Kana from './views/Kana.jsx'
import Layout from './views/Layout.jsx'
import Practice from './views/Practice.jsx'
import Reader from './views/Reader.jsx'
import Library from './views/Library.jsx'
import Review from './views/Review.jsx'
import Settings from './views/Settings.jsx'
import Stats from './views/Stats.jsx'
import Welcome from './views/Welcome.jsx'
import Words from './views/Words.jsx'

// Hash routing: the packaged app is loaded from file://, where path URLs break on reload.
export const router = createHashRouter([
  { path: '/welcome', element: <Welcome /> },
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'reader', element: <Library /> },
      { path: 'reader/:id', element: <Reader /> },
      { path: 'review', element: <Review /> },
      { path: 'practice', element: <Practice /> },
      { path: 'words', element: <Words /> },
      { path: 'kana', element: <Kana /> },
      { path: 'stats', element: <Stats /> },
      { path: 'settings', element: <Settings /> },
      { path: 'about', element: <About /> },
    ],
  },
])
