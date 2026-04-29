import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Canvas from './components/Canvas'
import SymmetryCanvas from './components/SymmetryCanvas'
import SymmetryControls from './components/SymmetryControls'
import Toolbar from './components/Toolbar'
import StatusBar from './components/StatusBar'
import { useStore } from './store'

export default function App() {
  const { setTool, undo, pendingLine, pendingCircleCenter, selectedTool } = useStore()

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
    <div className="relative w-full h-screen bg-canvas overflow-hidden">
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

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="absolute top-4 right-4 z-10 text-right pointer-events-none"
      >
        <div className="text-xs text-gray-700 font-medium tracking-widest uppercase">
          Geopatra
        </div>
        <div className="text-[10px] text-gray-800 mt-0.5">P · L · C · D</div>
      </motion.div>
    </div>
  )
}
