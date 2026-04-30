import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Canvas from './components/Canvas'
import SymmetryCanvas from './components/SymmetryCanvas'
import SymmetryControls from './components/SymmetryControls'
import Toolbar from './components/Toolbar'
import StatusBar from './components/StatusBar'
import TopBar from './components/TopBar'
import Gallery from './components/Gallery'
import ExportModal from './components/ExportModal'
import SaveModal from './components/SaveModal'
import { useWakeLock } from './hooks/useWakeLock'
import { useStore } from './store'

export default function App() {
  const { setTool, undo, pendingLine, pendingCircleCenter, selectedTool } = useStore()

  // Keep screen awake on iPad while the app is open
  useWakeLock()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return

      switch (e.key.toLowerCase()) {
        case 'p':
          setTool('point')
          break
        case 'l':
          setTool('line')
          break
        case 'c':
          setTool('circle')
          break
        case 'd':
          setTool('draw')
          break
        case 'z':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault()
            undo()
          }
          break
        case 'escape':
          useStore.setState({ pendingLine: null, pendingCircleCenter: null })
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setTool, undo])

  const hasPending = pendingLine !== null || pendingCircleCenter !== null
  const isDrawMode = selectedTool === 'draw'

  return (
    <div className="relative w-full h-screen bg-white overflow-hidden">
      {/* Layer 0: HTML canvas — grid + freehand symmetry strokes */}
      <SymmetryCanvas />

      {/* Layer 1: SVG — geometric objects; transparent to pointer when drawing */}
      <div className={`absolute inset-0 ${isDrawMode ? 'pointer-events-none' : ''}`}>
        <Canvas />
      </div>

      {/* Layer 2: UI overlays */}
      <Toolbar />
      <SymmetryControls />
      <StatusBar />
      <TopBar />

      {/* Pending operation banner */}
      <AnimatePresence>
        {hasPending && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-10"
          >
            <div className="bg-accent/10 border border-accent/30 rounded-lg px-3 py-1.5">
              <span className="text-xs text-accent">Esc drücken um abzubrechen</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Layer 3: Modals (portal-level z-index) */}
      <Gallery />
      <ExportModal />
      <SaveModal />
    </div>
  )
}
