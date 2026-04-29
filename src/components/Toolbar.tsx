import { motion } from 'framer-motion'
import { Dot, Minus, Circle, Trash2, Undo2, PenLine } from 'lucide-react'
import { useStore } from '../store'
import type { ToolType } from '../types'

interface Tool {
  id: ToolType
  label: string
  icon: React.ReactNode
  shortcut: string
}

const tools: Tool[] = [
  { id: 'point', label: 'Punkt', icon: <Dot size={20} />, shortcut: 'P' },
  { id: 'line', label: 'Linie', icon: <Minus size={20} />, shortcut: 'L' },
  { id: 'circle', label: 'Kreis', icon: <Circle size={20} />, shortcut: 'C' },
  { id: 'draw', label: 'Zeichnen', icon: <PenLine size={18} />, shortcut: 'D' },
]

export default function Toolbar() {
  const { selectedTool, setTool, undo, clear, objects, history } = useStore()

  return (
    <motion.div
      initial={{ x: -60, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="absolute safe-left top-1/2 -translate-y-1/2 z-10 flex flex-col gap-1"
    >
      {/* Tool group */}
      <div className="bg-surface border border-border rounded-xl p-1.5 flex flex-col gap-1 shadow-2xl">
        {tools.map((tool) => (
          <ToolButton
            key={tool.id}
            tool={tool}
            active={selectedTool === tool.id}
            onClick={() => setTool(tool.id)}
          />
        ))}
      </div>

      {/* Action group */}
      <div className="bg-surface border border-border rounded-xl p-1.5 flex flex-col gap-1 shadow-2xl">
        <ActionButton
          icon={<Undo2 size={18} />}
          label="Undo"
          onClick={undo}
          disabled={history.length === 0}
          shortcut="⌘Z"
        />
        <ActionButton
          icon={<Trash2 size={18} />}
          label="Alles löschen"
          onClick={clear}
          disabled={objects.length === 0}
          destructive
        />
      </div>
    </motion.div>
  )
}

function ToolButton({
  tool,
  active,
  onClick,
}: {
  tool: Tool
  active: boolean
  onClick: () => void
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      title={`${tool.label} (${tool.shortcut})`}
      className={`
        relative w-11 h-11 rounded-lg flex items-center justify-center
        transition-colors duration-150
        ${active
          ? 'bg-accent text-white shadow-lg shadow-accent/30'
          : 'text-gray-400 hover:text-gray-200 hover:bg-subtle'
        }
      `}
    >
      {tool.icon}
      {active && (
        <motion.span
          layoutId="active-tool"
          className="absolute inset-0 rounded-lg bg-accent -z-10"
          transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        />
      )}
    </motion.button>
  )
}

function ActionButton({
  icon,
  label,
  onClick,
  disabled,
  shortcut,
  destructive,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  disabled: boolean
  shortcut?: string
  destructive?: boolean
}) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? {} : { scale: 1.05 }}
      whileTap={disabled ? {} : { scale: 0.95 }}
      title={`${label}${shortcut ? ` (${shortcut})` : ''}`}
      className={`
        w-11 h-11 rounded-lg flex items-center justify-center
        transition-colors duration-150
        ${disabled
          ? 'text-gray-700 cursor-not-allowed'
          : destructive
            ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
            : 'text-gray-400 hover:text-gray-200 hover:bg-subtle'
        }
      `}
    >
      {icon}
    </motion.button>
  )
}
