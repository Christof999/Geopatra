import { useEffect } from 'react'
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
  const { undo } = useStore()

  // Keep screen awake on iPad while the app is open
  useWakeLock()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return

      if (e.key.toLowerCase() === 'z' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        undo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo])

  return (
    <div className="relative w-full h-screen bg-white overflow-hidden">
      {/* HTML canvas — white background, grid, freehand symmetry strokes */}
      <SymmetryCanvas />

      {/* UI overlays */}
      <Toolbar />
      <SymmetryControls />
      <StatusBar />
      <TopBar />

      {/* Modals */}
      <Gallery />
      <ExportModal />
      <SaveModal />
    </div>
  )
}
