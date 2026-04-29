import { motion } from 'framer-motion'
import { useStore } from '../store'

const TOOL_HINTS: Record<string, string> = {
  point: 'Klicken um einen Punkt zu setzen',
  line: 'Ersten Punkt klicken, dann zweiten Punkt klicken',
  circle: 'Mittelpunkt klicken, dann Radius-Punkt klicken',
}

const PENDING_HINTS: Record<string, string> = {
  line: 'Zweiten Punkt setzen – Esc zum Abbrechen',
  circle: 'Radius-Punkt setzen – Esc zum Abbrechen',
}

export default function StatusBar() {
  const { objects, selectedTool, pendingLine, pendingCircleCenter, ghostPoint } =
    useStore()

  const hasPending = pendingLine !== null || pendingCircleCenter !== null

  const hint = hasPending
    ? PENDING_HINTS[selectedTool] ?? ''
    : TOOL_HINTS[selectedTool] ?? ''

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-4"
    >
      <div className="bg-surface border border-border rounded-lg px-4 py-2 flex items-center gap-6 shadow-2xl">
        {/* Object count */}
        <span className="text-xs text-gray-500 tabular-nums">
          <span className="text-gray-300 font-medium">{objects.length}</span>{' '}
          {objects.length === 1 ? 'Objekt' : 'Objekte'}
        </span>

        <div className="w-px h-3 bg-border" />

        {/* Tool hint */}
        <motion.span
          key={hint}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className={`text-xs ${hasPending ? 'text-accent' : 'text-gray-500'}`}
        >
          {hint}
        </motion.span>

        {/* Cursor coords */}
        {ghostPoint && (
          <>
            <div className="w-px h-3 bg-border" />
            <span className="text-xs text-gray-600 tabular-nums font-mono">
              {Math.round(ghostPoint.x)}, {Math.round(ghostPoint.y)}
            </span>
          </>
        )}
      </div>
    </motion.div>
  )
}
