import { motion } from 'framer-motion'
import type { CSSProperties } from 'react'
import { Trash2, Undo2, Paintbrush2, Paintbrush, PaintBucket } from 'lucide-react'
import { useStore } from '../store'

const FILL_OPTIONS = [
  { label: 'Keine', value: 'none' },
  { label: '20%', value: 'rgba(0,0,0,0.20)' },
  { label: '40%', value: 'rgba(0,0,0,0.40)' },
  { label: '60%', value: 'rgba(0,0,0,0.60)' },
  { label: '80%', value: 'rgba(0,0,0,0.80)' },
  { label: 'Voll', value: '#1a1a1a' },
  { label: 'Dots fein', value: 'pat:dot-fine' },
  { label: 'Dots grob', value: 'pat:dot-coarse' },
  { label: 'Mandala', value: 'pat:dot-mandala' },
]

const STROKE_WIDTHS = [0.5, 1, 2, 3.5]

function patternSwatchStyle(pat: string): CSSProperties {
  switch (pat) {
    case 'pat:dot-fine':
      return {
        backgroundColor: 'rgba(255,255,255,0.04)',
        backgroundImage: 'radial-gradient(circle, #9ca3af 0.65px, transparent 0.7px)',
        backgroundSize: '5px 5px',
      }
    case 'pat:dot-coarse':
      return {
        backgroundColor: 'rgba(255,255,255,0.04)',
        backgroundImage: 'radial-gradient(circle, #9ca3af 1.1px, transparent 1.15px)',
        backgroundSize: '10px 10px',
      }
    case 'pat:dot-mandala':
      return {
        backgroundColor: 'rgba(255,255,255,0.04)',
        backgroundImage:
          'radial-gradient(circle at 25% 25%, #9ca3af 0.65px, transparent 0.7px), radial-gradient(circle at 75% 25%, #9ca3af 0.65px, transparent 0.7px), radial-gradient(circle at 50% 50%, #9ca3af 0.65px, transparent 0.7px), radial-gradient(circle at 25% 75%, #9ca3af 0.65px, transparent 0.7px), radial-gradient(circle at 75% 75%, #9ca3af 0.65px, transparent 0.7px)',
        backgroundSize: '14px 14px',
      }
    default:
      return { backgroundColor: 'rgba(255,255,255,0.04)' }
  }
}

function swatchBackground(value: string): CSSProperties {
  if (value === 'none') return { background: 'rgba(255,255,255,0.04)' }
  if (value.startsWith('pat:')) return patternSwatchStyle(value)
  return { background: value }
}

export default function Toolbar() {
  const { undo, clear, objects, history } = useStore()

  return (
    <>
      {/* Style panel — always anchored top-left */}
      <motion.div
        initial={{ x: -60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="absolute safe-top safe-left z-10"
      >
        <StylePanel />
      </motion.div>

      {/* Actions — always anchored bottom-left */}
      <motion.div
        initial={{ x: -60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="absolute safe-bottom safe-left z-10"
      >
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
    </>
  )
}

function StylePanel() {
  const {
    selectedTool,
    setTool,
    activeFill,
    activeStrokeWidth,
    setActiveFill,
    setActiveStrokeWidth,
  } = useStore()

  const fillLabel = FILL_OPTIONS.find((o) => o.value === activeFill)?.label ?? 'Füllung'

  return (
    <div className="bg-surface border border-border rounded-xl p-2 shadow-2xl" style={{ width: 108 }}>
      <p className="text-[9px] text-gray-600 uppercase tracking-wider px-0.5 mb-1.5">Werkzeug</p>
      <div className="flex gap-1 mb-2">
        <button
          type="button"
          title="Freihand zeichnen"
          onClick={() => setTool('draw')}
          className={`flex-1 h-8 rounded-md flex items-center justify-center transition-colors ${
            selectedTool === 'draw' ? 'bg-accent/25 text-accent ring-1 ring-accent/40' : 'bg-canvas hover:bg-subtle text-gray-400'
          }`}
        >
          <Paintbrush size={16} />
        </button>
        <button
          type="button"
          title="Geschlossene Fläche füllen (wie in Paint)"
          onClick={() => setTool('fill')}
          className={`flex-1 h-8 rounded-md flex items-center justify-center transition-colors ${
            selectedTool === 'fill' ? 'bg-accent/25 text-accent ring-1 ring-accent/40' : 'bg-canvas hover:bg-subtle text-gray-400'
          }`}
        >
          <PaintBucket size={16} />
        </button>
      </div>

      <div className="h-px bg-border mb-2" />

      {/* Active fill indicator — the "brush" */}
      <div className="flex items-center gap-1.5 mb-2 px-0.5">
        <Paintbrush2 size={13} className="text-gray-400 shrink-0" />
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {/* Color preview swatch */}
          <div
            className="w-5 h-5 rounded shrink-0"
            style={{
              ...swatchBackground(activeFill),
              border: '1.5px solid rgba(255,255,255,0.2)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {activeFill === 'none' && (
              <svg
                className="absolute inset-0 w-full h-full"
                viewBox="0 0 20 20"
                fill="none"
              >
                <line x1="3" y1="17" x2="17" y2="3" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            )}
          </div>
          <span className="text-[9px] text-gray-400 truncate">{fillLabel}</span>
        </div>
      </div>

      <div className="h-px bg-border mb-2" />

      {/* Fill swatches */}
      <p className="text-[9px] text-gray-600 uppercase tracking-wider px-0.5 mb-1.5">Füllung</p>
      <div className="grid grid-cols-3 gap-1 mb-2">
        {FILL_OPTIONS.map(({ label, value }) => {
          const isActive = activeFill === value
          return (
            <button
              key={value}
              onClick={() => setActiveFill(value)}
              title={label}
              className="h-8 rounded-md flex items-center justify-center transition-all relative"
              style={{
                ...swatchBackground(value),
                outline: isActive ? '2px solid #d1d5db' : '1.5px solid rgba(255,255,255,0.1)',
                outlineOffset: isActive ? '1px' : '0px',
              }}
            >
              {value === 'none' && (
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <line x1="2" y1="11" x2="11" y2="2" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              )}
              {isActive && value !== 'none' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white/70 shadow" />
                </div>
              )}
            </button>
          )
        })}
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
