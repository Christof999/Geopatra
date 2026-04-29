import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from '../store'

// Visual preview of symmetry count — tiny N-fold polygon icon
function SymmetryIcon({ steps }: { steps: number }) {
  const size = 28
  const cx = size / 2
  const cy = size / 2
  const r = 10

  const points = Array.from({ length: steps }, (_, i) => {
    const a = (i / steps) * Math.PI * 2 - Math.PI / 2
    return `${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`
  })

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {steps > 1 && (
        <polygon
          points={points.join(' ')}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
      )}
      {steps === 1 && (
        <line
          x1={cx}
          y1={cy - r}
          x2={cx}
          y2={cy + r}
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      )}
      <circle cx={cx} cy={cy} r={1.5} fill="currentColor" />
    </svg>
  )
}

export default function SymmetryControls() {
  const selectedTool = useStore((s) => s.selectedTool)
  const symmetrySteps = useStore((s) => s.symmetrySteps)
  const setSymmetrySteps = useStore((s) => s.setSymmetrySteps)

  return (
    <AnimatePresence>
      {selectedTool === 'draw' && (
        <motion.div
          key="sym-controls"
          initial={{ x: 64, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 64, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10"
        >
          <div className="bg-surface border border-border rounded-xl p-3 flex flex-col items-center gap-3 shadow-2xl w-14">
            {/* Label */}
            <span className="text-[9px] text-gray-600 uppercase tracking-widest font-medium">
              Sym
            </span>

            {/* Live icon */}
            <motion.div
              key={symmetrySteps}
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="text-accent"
            >
              <SymmetryIcon steps={symmetrySteps} />
            </motion.div>

            {/* Count */}
            <span className="text-base font-bold text-accent tabular-nums leading-none">
              {symmetrySteps}×
            </span>

            {/* Vertical slider via CSS rotation */}
            <div className="relative h-28 flex items-center justify-center">
              <input
                type="range"
                min={1}
                max={24}
                step={1}
                value={symmetrySteps}
                onChange={(e) => setSymmetrySteps(Number(e.target.value))}
                title={`Symmetrie: ${symmetrySteps}`}
                style={{
                  position: 'absolute',
                  width: '112px',
                  transform: 'rotate(-90deg)',
                  transformOrigin: 'center center',
                }}
              />
            </div>

            {/* Range labels */}
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[9px] text-gray-700">24</span>
              <span className="text-[9px] text-gray-800">1</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
