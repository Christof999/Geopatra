import { motion } from 'framer-motion'
import { Save, Download, BookImage } from 'lucide-react'
import { useStore } from '../store'

export default function TopBar() {
  const { setGalleryOpen, setExportModalOpen, setSaveModalOpen, objects } = useStore()

  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="absolute top-4 right-4 z-10 flex items-center gap-1.5"
    >
      <div className="bg-surface border border-border rounded-xl p-1 flex gap-0.5 shadow-xl">
        <TopBarButton
          icon={<Save size={15} />}
          label="Speichern"
          onClick={() => setSaveModalOpen(true)}
          disabled={objects.length === 0}
        />
        <TopBarButton
          icon={<Download size={15} />}
          label="Exportieren"
          onClick={() => setExportModalOpen(true)}
          disabled={objects.length === 0}
        />
        <div className="w-px bg-border mx-0.5 self-stretch" />
        <TopBarButton
          icon={<BookImage size={15} />}
          label="Galerie"
          onClick={() => setGalleryOpen(true)}
        />
      </div>

      {/* App name */}
      <div className="pl-2 text-right pointer-events-none">
        <div className="text-xs text-gray-700 font-medium tracking-widest uppercase">Geopatra</div>
        <div className="text-[10px] text-gray-800 mt-0.5">P · L · C · D</div>
      </div>
    </motion.div>
  )
}

function TopBarButton({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? {} : { scale: 1.08 }}
      whileTap={disabled ? {} : { scale: 0.92 }}
      title={label}
      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
        disabled
          ? 'text-gray-800 cursor-not-allowed'
          : 'text-gray-400 hover:text-gray-200 hover:bg-subtle'
      }`}
    >
      {icon}
    </motion.button>
  )
}
