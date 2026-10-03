import { Link, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import Home from './pages/Home'
import CreateEvent from './pages/CreateEvent'
import HostDashboard from './pages/HostDashboard'
import PrintCards from './pages/PrintCards'
import GuestWelcome from './pages/GuestWelcome'
import Camera from './pages/Camera'
import Album from './pages/Album'

export default function App() {
  const location = useLocation()
  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <Routes location={location}>
      <Route path="/" element={<Home />} />
      <Route path="/create" element={<CreateEvent />} />
      <Route path="/host/:code" element={<HostDashboard />} />
      <Route path="/host/:code/cards" element={<PrintCards />} />
      <Route path="/e/:code" element={<GuestWelcome />} />
      <Route path="/e/:code/camera" element={<Camera />} />
      <Route path="/e/:code/album" element={<Album />} />
      <Route path="*" element={<NotFound />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </MotionConfig>
  )
}

function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      <p className="heading text-5xl text-primary">Lost the negative</p>
      <p className="mt-3 text-ink-2">This page doesn&apos;t exist.</p>
      <Link to="/" className="btn-primary mt-8">
        Go home
      </Link>
    </main>
  )
}
