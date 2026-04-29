import { useRef, useEffect, useCallback } from 'react'
import { useStore } from '../store'
import { rotatePoint, generateId } from '../utils/geometry'
import type { GeoObject, GeoPath, StrokePoint } from '../types'

// ── Pure canvas drawing helpers (no React) ────────────────────────────────

function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#2a2a33'
  for (let x = 0; x <= w; x += 40) {
    for (let y = 0; y <= h; y += 40) {
      ctx.beginPath()
      ctx.arc(x, y, 0.8, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

function drawGuides(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  steps: number,
  w: number,
  h: number,
) {
  const guideLen = Math.hypot(w, h)

  if (steps > 1) {
    ctx.strokeStyle = 'rgba(99,102,241,0.08)'
    ctx.lineWidth = 1
    ctx.setLineDash([])
    for (let i = 0; i < steps; i++) {
      const angle = (i / steps) * Math.PI * 2
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(cx + Math.cos(angle) * guideLen, cy + Math.sin(angle) * guideLen)
      ctx.stroke()
    }
  }

  ctx.strokeStyle = 'rgba(99,102,241,0.3)'
  ctx.lineWidth = 1
  ctx.setLineDash([3, 4])
  ctx.beginPath()
  ctx.moveTo(cx - 20, cy)
  ctx.lineTo(cx + 20, cy)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(cx, cy - 20)
  ctx.lineTo(cx, cy + 20)
  ctx.stroke()
  ctx.setLineDash([])

  ctx.fillStyle = 'rgba(99,102,241,0.55)'
  ctx.beginPath()
  ctx.arc(cx, cy, 2.5, 0, Math.PI * 2)
  ctx.fill()
}

function drawStroke(
  ctx: CanvasRenderingContext2D,
  points: StrokePoint[],
  steps: number,
  cx: number,
  cy: number,
  color: string,
) {
  if (points.length < 2) return
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = color

  for (let s = 0; s < steps; s++) {
    const alpha = (s / steps) * Math.PI * 2
    for (let i = 1; i < points.length; i++) {
      const p0 = rotatePoint(points[i - 1].x, points[i - 1].y, cx, cy, alpha)
      const p1 = rotatePoint(points[i].x, points[i].y, cx, cy, alpha)
      const pressure = (points[i - 1].pressure + points[i].pressure) / 2
      ctx.lineWidth = Math.max(0.5, pressure * 3.5)
      ctx.beginPath()
      ctx.moveTo(p0.x, p0.y)
      ctx.lineTo(p1.x, p1.y)
      ctx.stroke()
    }
  }
}

// ── Component ─────────────────────────────────────────────────────────────

interface RenderState {
  objects: GeoObject[]
  symmetrySteps: number
  cx: number
  cy: number
  selectedTool: string
}

export default function SymmetryCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const liveRef = useRef<StrokePoint[]>([])
  const isDrawingRef = useRef(false)

  // Single ref that the persistent rAF loop reads — avoids restarting the loop
  const rs = useRef<RenderState>({
    objects: useStore.getState().objects,
    symmetrySteps: useStore.getState().symmetrySteps,
    cx: useStore.getState().symmetryCenter?.x ?? window.innerWidth / 2,
    cy: useStore.getState().symmetryCenter?.y ?? window.innerHeight / 2,
    selectedTool: useStore.getState().selectedTool,
  })

  const addPath = useStore((s) => s.addPath)
  const selectedTool = useStore((s) => s.selectedTool)

  // Sync Zustand state into the render-state ref (no loop restart needed)
  useEffect(
    () =>
      useStore.subscribe((s) => {
        rs.current.objects = s.objects
        rs.current.symmetrySteps = s.symmetrySteps
        rs.current.cx = s.symmetryCenter?.x ?? window.innerWidth / 2
        rs.current.cy = s.symmetryCenter?.y ?? window.innerHeight / 2
        rs.current.selectedTool = s.selectedTool
      }),
    [],
  )

  // Cancel live stroke when leaving draw mode
  useEffect(() => {
    if (selectedTool !== 'draw') {
      liveRef.current = []
      isDrawingRef.current = false
    }
  }, [selectedTool])

  // Canvas sizing — physical pixels = CSS pixels × DPR
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const applySize = () => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.round(window.innerWidth * dpr)
      canvas.height = Math.round(window.innerHeight * dpr)
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
      // Refresh viewport-center fallback
      if (!useStore.getState().symmetryCenter) {
        rs.current.cx = window.innerWidth / 2
        rs.current.cy = window.innerHeight / 2
      }
    }

    applySize()
    window.addEventListener('resize', applySize)
    return () => window.removeEventListener('resize', applySize)
  }, [])

  // Persistent rAF loop — reads rs.current and liveRef.current every frame
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let rafId: number

    const render = () => {
      const dpr = window.devicePixelRatio || 1
      const ctx = canvas.getContext('2d')!
      const w = window.innerWidth
      const h = window.innerHeight
      const { objects, symmetrySteps, cx, cy, selectedTool } = rs.current

      ctx.save()
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)

      drawGrid(ctx, w, h)

      for (const obj of objects) {
        if (obj.type === 'path') {
          drawStroke(ctx, obj.points, obj.steps, obj.centerX, obj.centerY, obj.style.stroke)
        }
      }

      if (liveRef.current.length >= 2) {
        drawStroke(ctx, liveRef.current, symmetrySteps, cx, cy, '#6366f1')
      }

      if (selectedTool === 'draw') {
        drawGuides(ctx, cx, cy, symmetrySteps, w, h)
      }

      ctx.restore()
      rafId = requestAnimationFrame(render)
    }

    rafId = requestAnimationFrame(render)
    return () => cancelAnimationFrame(rafId)
  }, []) // Intentionally empty — loop reads live refs, never needs restarting

  // ── Pointer handlers ──────────────────────────────────────────────────

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (rs.current.selectedTool !== 'draw') return
    e.currentTarget.setPointerCapture(e.pointerId)
    isDrawingRef.current = true
    liveRef.current = [{ x: e.clientX, y: e.clientY, pressure: e.pressure || 0.5 }]
  }, [])

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return
    // getCoalescedEvents gives Apple Pencil all intermediate points between frames
    const evts = (e.nativeEvent as PointerEvent).getCoalescedEvents?.() ?? [e.nativeEvent]
    for (const ev of evts) {
      liveRef.current.push({ x: ev.clientX, y: ev.clientY, pressure: ev.pressure || 0.5 })
    }
  }, [])

  const onPointerUp = useCallback(
    (_e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawingRef.current) return
      isDrawingRef.current = false

      const pts = liveRef.current.slice()
      liveRef.current = []

      if (pts.length < 2) return

      const { cx, cy, symmetrySteps } = rs.current
      const path: GeoPath = {
        id: generateId(),
        type: 'path',
        points: pts,
        steps: symmetrySteps,
        centerX: cx,
        centerY: cy,
        style: { stroke: '#6366f1', strokeWidth: 1.5, fill: 'none', opacity: 1 },
      }
      addPath(path)
    },
    [addPath],
  )

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0"
      style={{
        touchAction: 'none',
        pointerEvents: selectedTool === 'draw' ? 'auto' : 'none',
        cursor: selectedTool === 'draw' ? 'crosshair' : 'default',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    />
  )
}
