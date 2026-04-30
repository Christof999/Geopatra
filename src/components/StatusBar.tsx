import { motion } from 'framer-motion'
import { useStore } from '../store'

export default function StatusBar() {
  const { objects } = useStore()

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="absolute safe-bottom left-1/2 -translate-x-1/2 z-10"
    >
      <div className="bg-surface border border-border rounded-lg px-4 py-2 shadow-2xl">
        <span className="text-xs text-gray-500 tabular-nums">
          <span className="text-gray-300 font-medium">{objects.length}</span>{' '}
          {objects.length === 1 ? 'Pfad' : 'Pfade'}
        </span>
      </div>
    </motion.div>
  )
}
