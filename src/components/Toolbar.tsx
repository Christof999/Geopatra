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

const FILL_OPTIONS = [
  { label: 'Keine', value: 'none' },
  { label: '20%', value: 'rgba(0,0,0,0.20)' },
  { label: '40%', value: 'rgba(0,0,0,0.40)' },
  { label: '60%', value: 'rgba(0,0,0,0.60)' },
  { label: '80%', value: 'rgba(0,0,0,0.80)' },
  { label: 'Voll', value: '#1a1a1a' },
]

const STROKE_WIDTHS = [0.5, 1, 2, 3.5]

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

      {/* Style group */}
      <StylePanel />
    </motion.div>
  )
}

function StylePanel() {
  const { activeFill, activeStrokeWidth, setActiveFill, setActiveStrokeWidth } = useStore()

  return (
    <div className="bg-surface border border-border rounded-xl p-2 shadow-2xl" style={{ width: 100 }}>
      {/* Fill */}
      <p className="text-[9px] text-gray-600 uppercase tracking-wider px-0.5 mb-1.5">Füllung</p>
      <div className="grid grid-cols-3 gap-1 mb-2">
        {FILL_OPTIONS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setActiveFill(value)}
            title={label}
            className="h-7 rounded-md flex items-center justify-center transition-all"
            style={{
              background: value === 'none' ? 'transparent' : value,
              outline:
                activeFill === value
                  ? '2px solid #6b7280'
                  : '1.5px solid rgba(255,255,255,0.12)',
              outlineOffset: activeFill === value ? '1px' : '0px',
            }}
          >
            {value === 'none' && (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <line
                  x1="1"
                  y1="11"
                  x2="11"
                  y2="1"
                  stroke="#6b7280"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </button>
        ))}
      </div>

      <div className="h-px bg-border mb-2" />

      {/* Stroke width */}
      <p className="text-[9px] text-gray-600 uppercase tracking-wider px-0.5 mb-1.5">Stärke</p>
      <div className="flex flex-col gap-0.5">
        {STROKE_WIDTHS.map((w) => (
          <button
            key={w}
            onClick={() => setActiveStrokeWidth(w)}
            title={`${w}px`}
            className={`w-full h-7 rounded-md flex items-center gap-2 px-1.5 transition-colors ${
              activeStrokeWidth === w ? 'bg-white/10' : 'hover:bg-white/5'
            }`}
          >
            <div
              className="rounded-full bg-gray-400 shrink-0"
              style={{ width: 22, height: Math.max(1, Math.min(w, 5)) }}
            />
            <span className="text-[10px] text-gray-500 tabular-nums">{w}</span>
          </button>
        ))}
      </div>
    </div>
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
          transition={{ type: 'spring' as const, stiffness: 400, damping: 35 }}
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
