import { create } from 'zustand'
import type { DesignDoc, GeoObject, GeoPath, ToolType, Point } from './types'
import { generateId, hitClosedPathStep, isPathFillable } from './utils/geometry'
import { setPathStepFill } from './utils/pathFill'
import { createBucketFillRegion, fillRegionContainsPoint } from './utils/fillRegion'

const DEFAULT_STYLE = {
  stroke: '#1a1a1a',
  strokeWidth: 1.5,
  fill: 'none',
  opacity: 1,
}

const POINT_STYLE = {
  stroke: '#1a1a1a',
  strokeWidth: 1.5,
  fill: '#1a1a1a',
  opacity: 1,
}

interface StoreState {
  objects: GeoObject[]
  selectedTool: ToolType
  snapThreshold: number
  history: GeoObject[][]
  pendingLine: { x1: number; y1: number } | null
  pendingCircleCenter: { x: number; y: number } | null
  ghostPoint: Point | null
  symmetrySteps: number
  symmetryCenter: Point | null

  activeStroke: string
  activeFill: string
  activeStrokeWidth: number

  setTool: (tool: ToolType) => void
  setGhostPoint: (p: Point | null) => void
  setSymmetrySteps: (n: number) => void
  setSymmetryCenter: (p: Point | null) => void
  setActiveStroke: (c: string) => void
  setActiveFill: (f: string) => void
  setActiveStrokeWidth: (w: number) => void

  galleryOpen: boolean
  exportModalOpen: boolean
  saveModalOpen: boolean

  setGalleryOpen: (open: boolean) => void
  setExportModalOpen: (open: boolean) => void
  setSaveModalOpen: (open: boolean) => void

  handleCanvasClick: (point: Point) => void
  applyBucketFill: (point: Point) => void
  addPath: (path: GeoPath) => void
  loadDesign: (design: DesignDoc) => void

  undo: () => void
  clear: () => void
}

export const useStore = create<StoreState>((set, get) => ({
  objects: [],
  selectedTool: 'draw',
  snapThreshold: 12,
  history: [],
  pendingLine: null,
  pendingCircleCenter: null,
  ghostPoint: null,
  symmetrySteps: 6,
  symmetryCenter: null,
  activeStroke: '#1a1a1a',
  activeFill: 'rgba(0,0,0,0.20)',
  activeStrokeWidth: 1.5,

  setTool: (tool) =>
    set({
      selectedTool: tool,
      pendingLine: null,
      pendingCircleCenter: null,
      ghostPoint: tool === 'draw' || tool === 'fill' ? null : get().ghostPoint,
    }),

  setGhostPoint: (p) => set({ ghostPoint: p }),

  setSymmetrySteps: (n) => set({ symmetrySteps: Math.max(1, Math.min(24, n)) }),

  setSymmetryCenter: (p) => set({ symmetryCenter: p }),

  setActiveStroke: (c) => set({ activeStroke: c }),
  setActiveFill: (f) => set({ activeFill: f }),
  setActiveStrokeWidth: (w) => set({ activeStrokeWidth: w }),

  galleryOpen: false,
  exportModalOpen: false,
  saveModalOpen: false,

  setGalleryOpen: (open) => set({ galleryOpen: open }),
  setExportModalOpen: (open) => set({ exportModalOpen: open }),
  setSaveModalOpen: (open) => set({ saveModalOpen: open }),

  loadDesign: (design) => {
    const { objects, history } = get()
    set({
      history: [...history, objects],
      objects: design.objectsData,
      symmetrySteps: design.symmetrySteps,
      galleryOpen: false,
    })
  },

  applyBucketFill: (point) => {
    const { objects, history, activeFill, activeStroke } = get()
    const { x: px, y: py } = point

    if (activeFill === 'none') {
      const next = objects.filter(
        (obj) => obj.type !== 'fillRegion' || !fillRegionContainsPoint(obj, point),
      )
      if (next.length !== objects.length) {
        set({ history: [...history, objects], objects: next })
        return
      }
    } else if (typeof window !== 'undefined') {
      const fillRegion = createBucketFillRegion(
        objects,
        point,
        activeFill,
        activeStroke,
        window.innerWidth,
        window.innerHeight,
      )

      if (fillRegion) {
        set({ history: [...history, objects], objects: [...objects, fillRegion] })
        return
      }
    }

    for (let i = objects.length - 1; i >= 0; i--) {
      const obj = objects[i]
      if (obj.type !== 'path') continue
      const hitStep = hitClosedPathStep(px, py, obj)
      if (hitStep === null) continue
      const next = objects.slice()
      next[i] = {
        ...setPathStepFill(obj, hitStep, activeFill),
        closed: obj.closed || isPathFillable(obj),
      }
      set({ history: [...history, objects], objects: next })
      return
    }
  },

  handleCanvasClick: (point) => {
    const { selectedTool, objects, history, pendingLine, pendingCircleCenter } = get()

    switch (selectedTool) {
      case 'point': {
        const newPoint: GeoObject = {
          id: generateId(),
          type: 'point',
          x: point.x,
          y: point.y,
          style: POINT_STYLE,
        }
        set({
          history: [...history, objects],
          objects: [...objects, newPoint],
        })
        break
      }

      case 'line': {
        if (!pendingLine) {
          set({ pendingLine: { x1: point.x, y1: point.y } })
        } else {
          const newLine: GeoObject = {
            id: generateId(),
            type: 'line',
            x1: pendingLine.x1,
            y1: pendingLine.y1,
            x2: point.x,
            y2: point.y,
            style: DEFAULT_STYLE,
          }
          set({
            history: [...history, objects],
            objects: [...objects, newLine],
            pendingLine: null,
          })
        }
        break
      }

      case 'circle': {
        if (!pendingCircleCenter) {
          set({ pendingCircleCenter: { x: point.x, y: point.y } })
        } else {
          const dx = point.x - pendingCircleCenter.x
          const dy = point.y - pendingCircleCenter.y
          const r = Math.sqrt(dx * dx + dy * dy)
          if (r > 2) {
            const newCircle: GeoObject = {
              id: generateId(),
              type: 'circle',
              cx: pendingCircleCenter.x,
              cy: pendingCircleCenter.y,
              r,
              style: DEFAULT_STYLE,
            }
            set({
              history: [...history, objects],
              objects: [...objects, newCircle],
              pendingCircleCenter: null,
            })
          } else {
            set({ pendingCircleCenter: null })
          }
        }
        break
      }
    }
  },

  addPath: (path) => {
    const { objects, history } = get()
    set({ history: [...history, objects], objects: [...objects, path] })
  },

  undo: () => {
    const { history } = get()
    if (history.length === 0) return
    const prev = history[history.length - 1]
    set({
      objects: prev,
      history: history.slice(0, -1),
      pendingLine: null,
      pendingCircleCenter: null,
    })
  },

  clear: () =>
    set((state) => ({
      history: [...state.history, state.objects],
      objects: [],
      pendingLine: null,
      pendingCircleCenter: null,
    })),
}))
