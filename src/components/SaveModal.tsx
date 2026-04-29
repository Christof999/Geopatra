import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Save, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { useStore } from '../store'
import { isFirebaseConfigured } from '../firebase'
import { saveDesign } from '../services/firestoreService'
import { uploadThumbnail } from '../services/storageService'
import { generateThumbnail } from '../services/exportService'
import { generateId } from '../utils/geometry'

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

type SaveState = 'idle' | 'saving' | 'success' | 'error'

export default function SaveModal() {
  const { saveModalOpen, setSaveModalOpen, objects, symmetrySteps } = useStore()

  const [title, setTitle] = useState('')
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const configured = isFirebaseConfigured()
  const pathCount = objects.filter((o) => o.type === 'path').length
  const totalCount = objects.length

  async function handleSave() {
    if (!title.trim() || !configured) return
    setSaveState('saving')
    setErrorMsg('')

    try {
      const designId = generateId()
      const thumbnail = generateThumbnail(objects, window.innerWidth, window.innerHeight)
      const thumbnailUrl = await uploadThumbnail(designId, thumbnail)

      await saveDesign({
        title: title.trim(),
        createdAt: new Date(),
        symmetrySteps,
        objectsData: objects,
        thumbnailUrl,
      })

      setSaveState('success')
      setTimeout(() => {
        setSaveModalOpen(false)
        setTitle('')
        setSaveState('idle')
      }, 1200)
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Unbekannter Fehler')
      setSaveState('error')
    }
  }

  function handleClose() {
    if (saveState === 'saving') return
    setSaveModalOpen(false)
    setTitle('')
    setSaveState('idle')
    setErrorMsg('')
  }

  return (
    <AnimatePresence>
      {saveModalOpen && (
        <motion.div
          variants={backdrop}
          initial="hidden"
          animate="show"
          exit="exit"
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <motion.div
            variants={modal}
            className="bg-surface border border-border rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-sm font-semibold text-gray-200 tracking-wide uppercase">
                Design speichern
              </h2>
              <button
                onClick={handleClose}
                disabled={saveState === 'saving'}
                className="text-gray-500 hover:text-gray-200 transition-colors p-1 rounded-lg hover:bg-subtle disabled:opacity-40"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4">
              {!configured ? (
                <div className="flex items-start gap-2 text-amber-400 text-xs p-3 bg-amber-500/10 rounded-lg">
                  <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                  <span>
                    Firebase ist nicht konfiguriert. Speichern in der Cloud ist nicht möglich.
                    Du kannst trotzdem als PNG/PDF exportieren.
                  </span>
                </div>
              ) : (
                <>
                  {/* Title input */}
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-widest block mb-2">
                      Titel
                    </label>
                    <input
                      type="text"
                      autoFocus
                      placeholder="z. B. Mandala Schulterblatt"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                      disabled={saveState === 'saving' || saveState === 'success'}
                      className="w-full bg-canvas border border-border rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder-gray-700 focus:outline-none focus:border-accent/50 transition-colors disabled:opacity-50"
                    />
                  </div>

                  {/* Design stats */}
                  <div className="bg-canvas rounded-lg px-4 py-3 grid grid-cols-2 gap-y-1.5">
                    <Stat label="Symmetrie" value={`${symmetrySteps}×`} />
                    <Stat label="Pfade" value={pathCount} />
                    <Stat label="Objekte gesamt" value={totalCount} />
                  </div>

                  {/* Error */}
                  {saveState === 'error' && (
                    <div className="flex items-center gap-2 text-red-400 text-xs p-3 bg-red-500/10 rounded-lg">
                      <AlertCircle size={14} />
                      {errorMsg}
                    </div>
                  )}

                  {/* Save button */}
                  <motion.button
                    onClick={handleSave}
                    disabled={!title.trim() || saveState === 'saving' || saveState === 'success'}
                    whileHover={title.trim() ? { scale: 1.02 } : {}}
                    whileTap={title.trim() ? { scale: 0.98 } : {}}
                    className={`w-full py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors ${
                      !title.trim()
                        ? 'bg-subtle text-gray-700 cursor-not-allowed'
                        : saveState === 'success'
                          ? 'bg-green-600/80 text-white'
                          : 'bg-accent text-white hover:bg-accent-dim shadow-lg shadow-accent/20'
                    }`}
                  >
                    {saveState === 'saving' && <Loader2 size={16} className="animate-spin" />}
                    {saveState === 'success' && <CheckCircle size={16} />}
                    {saveState === 'idle' || saveState === 'error' ? <Save size={16} /> : null}

                    {saveState === 'saving'
                      ? 'Speichere…'
                      : saveState === 'success'
                        ? 'Gespeichert!'
                        : 'In Galerie speichern'}
                  </motion.button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-gray-700">{label}</span>
      <span className="text-xs font-medium text-gray-400 tabular-nums">{value}</span>
    </div>
  )
}
