import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Search, Trash2, Download, AlertCircle, Loader2 } from 'lucide-react'
import { format, isAfter, subWeeks, subMonths } from 'date-fns'
import { de } from 'date-fns/locale'
import { useStore } from '../store'
import { isFirebaseConfigured } from '../firebase'
import { loadDesigns, deleteDesign } from '../services/firestoreService'
import { deleteThumbnail } from '../services/storageService'
import type { DesignDoc } from '../types'

type FilterType = 'all' | 'week' | 'month'

// ── Animation variants ─────────────────────────────────────────────────────

const backdrop = {
  hidden: { opacity: 0 },
  show: { opacity: 1 },
  exit: { opacity: 0 },
}

const panel = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 320, damping: 32 } },
  exit: { opacity: 0, y: 24, transition: { duration: 0.2 } },
}

const grid = {
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
}

const card = {
  hidden: { opacity: 0, y: 20, scale: 0.94 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 400, damping: 28 } },
  exit: { opacity: 0, scale: 0.88, transition: { duration: 0.18 } },
}

// ── Component ─────────────────────────────────────────────────────────────

export default function Gallery() {
  const { galleryOpen, setGalleryOpen, loadDesign } = useStore()

  const [designs, setDesigns] = useState<DesignDoc[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const configured = isFirebaseConfigured()

  useEffect(() => {
    if (!galleryOpen || !configured) return
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      setLoading(true)
      setError(null)
      loadDesigns()
        .then((data) => {
          if (!cancelled) setDesigns(data)
        })
        .catch((e) => {
          if (!cancelled) setError(e.message)
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    })
    return () => {
      cancelled = true
    }
  }, [galleryOpen, configured])

  const filtered = useMemo(() => {
    const now = new Date()
    return designs
      .filter((d) => {
        if (filter === 'week') return isAfter(d.createdAt, subWeeks(now, 1))
        if (filter === 'month') return isAfter(d.createdAt, subMonths(now, 1))
        return true
      })
      .filter((d) => d.title.toLowerCase().includes(search.toLowerCase()))
  }, [designs, filter, search])

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await deleteDesign(id)
      await deleteThumbnail(id)
      setDesigns((prev) => prev.filter((d) => d.id !== id))
    } catch {
      // silently fail — item stays in list
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <AnimatePresence>
      {galleryOpen && (
        <motion.div
          variants={backdrop}
          initial="hidden"
          animate="show"
          exit="exit"
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setGalleryOpen(false)}
        >
          <motion.div
            variants={panel}
            className="bg-surface border border-border rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
              <h2 className="text-sm font-semibold text-gray-200 tracking-wide uppercase">
                Galerie
              </h2>
              <button
                onClick={() => setGalleryOpen(false)}
                className="text-gray-500 hover:text-gray-200 transition-colors p-1 rounded-lg hover:bg-subtle"
              >
                <X size={18} />
              </button>
            </div>

            {/* Search + Filters */}
            <div className="px-5 py-3 border-b border-border flex gap-3 items-center flex-shrink-0">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                <input
                  type="text"
                  placeholder="Titel suchen…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-canvas border border-border rounded-lg pl-8 pr-3 py-1.5 text-sm text-gray-300 placeholder-gray-700 focus:outline-none focus:border-accent/50 transition-colors"
                />
              </div>
              <div className="flex gap-1">
                {(['all', 'week', 'month'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                      filter === f
                        ? 'bg-accent text-white'
                        : 'text-gray-500 hover:text-gray-300 hover:bg-subtle'
                    }`}
                  >
                    {f === 'all' ? 'Alle' : f === 'week' ? 'Diese Woche' : 'Letzter Monat'}
                  </button>
                ))}
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5">
              {!configured && (
                <NotConfigured />
              )}

              {configured && loading && (
                <div className="flex items-center justify-center h-48 text-gray-600">
                  <Loader2 size={24} className="animate-spin mr-2" />
                  <span className="text-sm">Lade Designs…</span>
                </div>
              )}

              {configured && error && (
                <div className="flex items-center gap-2 text-red-400 text-sm p-4 bg-red-500/10 rounded-lg">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              {configured && !loading && !error && filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center h-48 text-gray-700">
                  <p className="text-sm">Keine Designs gefunden.</p>
                </div>
              )}

              {configured && !loading && !error && filtered.length > 0 && (
                <motion.div
                  variants={grid}
                  initial="hidden"
                  animate="show"
                  className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
                >
                  <AnimatePresence>
                    {filtered.map((design) => (
                      <motion.div
                        key={design.id}
                        variants={card}
                        exit="exit"
                        layout
                        layoutId={`design-${design.id}`}
                        className="group relative bg-canvas border border-border rounded-xl overflow-hidden cursor-pointer hover:border-accent/40 transition-colors"
                        onClick={() => loadDesign(design)}
                      >
                        {/* Thumbnail */}
                        <div className="aspect-square bg-canvas/50 overflow-hidden">
                          {design.thumbnailUrl ? (
                            <img
                              src={design.thumbnailUrl}
                              alt={design.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-800">
                              <Download size={24} />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="p-2.5">
                          <p className="text-xs font-medium text-gray-300 truncate">
                            {design.title}
                          </p>
                          <p className="text-[10px] text-gray-700 mt-0.5">
                            {format(design.createdAt, 'dd. MMM yyyy', { locale: de })}
                          </p>
                          <p className="text-[10px] text-gray-800 mt-0.5">
                            {design.symmetrySteps}× Symmetrie
                          </p>
                        </div>

                        {/* Delete overlay */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(design.id)
                          }}
                          disabled={deletingId === design.id}
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-canvas/80 text-red-400 hover:text-red-300 p-1.5 rounded-lg"
                        >
                          {deletingId === design.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Trash2 size={12} />
                          )}
                        </button>

                        {/* Load hint overlay */}
                        <div className="absolute inset-0 bg-accent/0 group-hover:bg-accent/5 transition-colors pointer-events-none rounded-xl" />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function NotConfigured() {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4 text-center px-8">
      <AlertCircle size={32} className="text-gray-700" />
      <div>
        <p className="text-sm text-gray-500 font-medium">Firebase nicht konfiguriert</p>
        <p className="text-xs text-gray-700 mt-2 leading-relaxed">
          Kopiere <code className="text-gray-600 bg-subtle px-1 py-0.5 rounded">.env.example</code>{' '}
          zu <code className="text-gray-600 bg-subtle px-1 py-0.5 rounded">.env.local</code> und
          füge deine Firebase-Zugangsdaten ein.
        </p>
      </div>
    </div>
  )
}
