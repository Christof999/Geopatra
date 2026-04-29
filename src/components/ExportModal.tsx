import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Download, Loader2, Link } from 'lucide-react'
import { useStore } from '../store'
import { cmToPixels, exportAsPNG, exportAsPDF, EXPORT_DPI } from '../services/exportService'

type Format = 'png' | 'pdf'

const backdrop = {
  hidden: { opacity: 0 },
  show: { opacity: 1 },
  exit: { opacity: 0 },
}

const modal = {
  hidden: { opacity: 0, scale: 0.94, y: 16 },
  show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring' as const, stiffness: 400, damping: 30 } },
  exit: { opacity: 0, scale: 0.94, y: 8, transition: { duration: 0.18 } },
}

export default function ExportModal() {
  const { exportModalOpen, setExportModalOpen, objects } = useStore()

  const [widthCm, setWidthCm] = useState(10)
  const [heightCm, setHeightCm] = useState(10)
  const [lockAspect, setLockAspect] = useState(true)
  const [stencil, setStencil] = useState(false)
  const [format, setFormat] = useState<Format>('png')
  const [exporting, setExporting] = useState(false)

  const pxW = useMemo(() => cmToPixels(widthCm), [widthCm])
  const pxH = useMemo(() => cmToPixels(heightCm), [heightCm])

  function handleWidthChange(v: number) {
    setWidthCm(v)
    if (lockAspect) setHeightCm(v)
  }

  function handleHeightChange(v: number) {
    setHeightCm(v)
    if (lockAspect) setWidthCm(v)
  }

  async function handleExport() {
    setExporting(true)
    const srcW = window.innerWidth
    const srcH = window.innerHeight
    try {
      if (format === 'png') {
        await exportAsPNG(objects, srcW, srcH, widthCm, heightCm, stencil)
      } else {
        await exportAsPDF(objects, srcW, srcH, widthCm, heightCm, stencil)
      }
      setExportModalOpen(false)
    } finally {
      setExporting(false)
    }
  }

  return (
    <AnimatePresence>
      {exportModalOpen && (
        <motion.div
          variants={backdrop}
          initial="hidden"
          animate="show"
          exit="exit"
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setExportModalOpen(false)}
        >
          <motion.div
            variants={modal}
            className="bg-surface border border-border rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-sm font-semibold text-gray-200 tracking-wide uppercase">
                Tattoo Export
              </h2>
              <button
                onClick={() => setExportModalOpen(false)}
                className="text-gray-500 hover:text-gray-200 transition-colors p-1 rounded-lg hover:bg-subtle"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-5">
              {/* Size */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs text-gray-500 uppercase tracking-widest">
                    Physische Größe
                  </label>
                  <button
                    onClick={() => setLockAspect((v) => !v)}
                    title={lockAspect ? 'Seitenverhältnis gesperrt' : 'Frei eingeben'}
                    className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded transition-colors ${
                      lockAspect
                        ? 'bg-accent/20 text-accent'
                        : 'bg-subtle text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    <Link size={10} />
                    {lockAspect ? 'Gesperrt' : 'Frei'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <CmInput
                    label="Breite"
                    value={widthCm}
                    onChange={handleWidthChange}
                  />
                  <CmInput
                    label="Höhe"
                    value={heightCm}
                    onChange={handleHeightChange}
                  />
                </div>

                {/* Resolution preview */}
                <div className="mt-3 bg-canvas rounded-lg px-3 py-2 flex items-center justify-between">
                  <span className="text-xs text-gray-600">{EXPORT_DPI} DPI</span>
                  <span className="text-xs font-mono text-gray-400">
                    {pxW.toLocaleString('de')} × {pxH.toLocaleString('de')} px
                  </span>
                </div>
              </section>

              {/* Mode */}
              <section>
                <label className="text-xs text-gray-500 uppercase tracking-widest block mb-3">
                  Modus
                </label>
                <div className="flex flex-col gap-2">
                  <ModeOption
                    active={!stencil}
                    onClick={() => setStencil(false)}
                    label="Farbig"
                    desc="Dunkler Hintergrund, farbige Striche"
                  />
                  <ModeOption
                    active={stencil}
                    onClick={() => setStencil(true)}
                    label="Schablone"
                    desc="Weißer Grund, schwarze Outlines — druckfertig"
                  />
                </div>
              </section>

              {/* Format */}
              <section>
                <label className="text-xs text-gray-500 uppercase tracking-widest block mb-3">
                  Format
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['png', 'pdf'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFormat(f)}
                      className={`py-2 rounded-lg text-sm font-medium uppercase tracking-wide transition-colors ${
                        format === f
                          ? 'bg-accent text-white'
                          : 'bg-canvas border border-border text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </section>

              {/* Export button */}
              <motion.button
                onClick={handleExport}
                disabled={exporting || objects.length === 0}
                whileHover={objects.length > 0 ? { scale: 1.02 } : {}}
                whileTap={objects.length > 0 ? { scale: 0.98 } : {}}
                className={`w-full py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors ${
                  objects.length === 0
                    ? 'bg-subtle text-gray-700 cursor-not-allowed'
                    : 'bg-accent text-white hover:bg-accent-dim shadow-lg shadow-accent/20'
                }`}
              >
                {exporting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Exportiere…
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    Als {format.toUpperCase()} exportieren
                  </>
                )}
              </motion.button>

              {objects.length === 0 && (
                <p className="text-center text-xs text-gray-700 -mt-2">
                  Canvas ist leer — zeichne zuerst etwas.
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────

function CmInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div>
      <label className="text-[10px] text-gray-600 block mb-1">{label}</label>
      <div className="flex items-center gap-1 bg-canvas border border-border rounded-lg px-3 py-2 focus-within:border-accent/50 transition-colors">
        <input
          type="number"
          min={1}
          max={100}
          step={0.5}
          value={value}
          onChange={(e) => onChange(Math.max(0.5, parseFloat(e.target.value) || 1))}
          className="bg-transparent text-sm text-gray-200 w-full focus:outline-none tabular-nums"
        />
        <span className="text-xs text-gray-600 flex-shrink-0">cm</span>
      </div>
    </div>
  )
}

function ModeOption({
  active,
  onClick,
  label,
  desc,
}: {
  active: boolean
  onClick: () => void
  label: string
  desc: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${
        active ? 'border-accent/50 bg-accent/10' : 'border-border hover:border-subtle'
      }`}
    >
      <span
        className={`mt-0.5 w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 ${
          active ? 'border-accent bg-accent' : 'border-gray-600'
        }`}
      />
      <div>
        <span className="text-xs font-medium text-gray-300">{label}</span>
        <p className="text-[10px] text-gray-600 mt-0.5 leading-snug">{desc}</p>
      </div>
    </button>
  )
}
