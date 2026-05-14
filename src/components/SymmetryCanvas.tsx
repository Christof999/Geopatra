import { useRef, useEffect, useCallback } from 'react'
import { useStore } from '../store'
import { rotatePoint, generateId, isStrokeClosed } from '../utils/geometry'
import { resolveFillStyle } from '../utils/canvasFill'
import type { GeoObject, StrokePoint } from '../types'

// ── Pure canvas drawing helpers (no React) ────────────────────────────────

function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#d4d4d4'
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
    ctx.strokeStyle = 'rgba(0,0,0,0.06)'
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

  ctx.strokeStyle = 'rgba(0,0,0,0.2)'
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

  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  ctx.beginPath()
  ctx.arc(cx, cy, 2.5, 0, Math.PI * 2)
  ctx.fill()
}

function drawFillCursor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  fill: string,
  stroke: string,
) {
  const swatchX = x + 20
  const swatchY = y + 18
  const swatchRadius = 9

  ctx.save()

  ctx.strokeStyle = 'rgba(17, 24, 39, 0.75)'
  ctx.lineWidth = 1.25
  ctx.beginPath()
  ctx.arc(x, y, 6, 0, Math.PI * 2)
  ctx.moveTo(x - 10, y)
  ctx.lineTo(x - 4, y)
  ctx.moveTo(x + 4, y)
  ctx.lineTo(x + 10, y)
  ctx.moveTo(x, y - 10)
  ctx.lineTo(x, y - 4)
  ctx.moveTo(x, y + 4)
  ctx.lineTo(x, y + 10)
  ctx.stroke()

  ctx.shadowColor = 'rgba(0, 0, 0, 0.28)'
  ctx.shadowBlur = 8
  ctx.shadowOffsetY = 2
  ctx.fillStyle = 'rgba(255, 255, 255, 0.96)'
  ctx.beginPath()
  ctx.arc(swatchX, swatchY, swatchRadius + 4, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowColor = 'transparent'

  ctx.beginPath()
  ctx.arc(swatchX, swatchY, swatchRadius, 0, Math.PI * 2)
  ctx.clip()

  const fs = resolveFillStyle(ctx, fill, stroke)
  if (fs === 'none') {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(swatchX - swatchRadius, swatchY - swatchRadius, swatchRadius * 2, swatchRadius * 2)
    ctx.strokeStyle = '#6b7280'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(swatchX - 6, swatchY + 6)
    ctx.lineTo(swatchX + 6, swatchY - 6)
    ctx.stroke()
  } else {
    ctx.fillStyle = fs
    ctx.fillRect(swatchX - swatchRadius, swatchY - swatchRadius, swatchRadius * 2, swatchRadius * 2)
  }

  ctx.restore()

  ctx.save()
  ctx.strokeStyle = 'rgba(17, 24, 39, 0.8)'
  ctx.lineWidth = 1.25
  ctx.beginPath()
  ctx.arc(swatchX, swatchY, swatchRadius + 4, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}

function drawStroke(
  ctx: CanvasRenderingContext2D,
  points: StrokePoint[],
  steps: number,
  cx: number,
  cy: number,
  stroke: string,
  strokeWidth: number,
  fill: string,
  closed: boolean,
) {
  if (points.length < 2) return
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  for (let s = 0; s < steps; s++) {
    const alpha = (s / steps) * Math.PI * 2

    // Fill pass — build the complete path outline, then fill
    if (fill !== 'none') {
      ctx.beginPath()
      const fp = rotatePoint(points[0].x, points[0].y, cx, cy, alpha)
      ctx.moveTo(fp.x, fp.y)
      for (let i = 1; i < points.length; i++) {
        const p = rotatePoint(points[i].x, points[i].y, cx, cy, alpha)
        ctx.lineTo(p.x, p.y)
      }
      if (closed) ctx.closePath()
      const fs = resolveFillStyle(ctx, fill, stroke)
      if (fs !== 'none') {
        ctx.fillStyle = fs
        ctx.fill()
      }
    }

    // Stroke pass — pressure-sensitive segments
    ctx.strokeStyle = stroke
    for (let i = 1; i < points.length; i++) {
      const p0 = rotatePoint(points[i - 1].x, points[i - 1].y, cx, cy, alpha)
      const p1 = rotatePoint(points[i].x, points[i].y, cx, cy, alpha)
      const pressure = (points[i - 1].pressure + points[i].pressure) / 2
      ctx.lineWidth = Math.max(0.5, pressure * strokeWidth * 2)
      ctx.beginPath()
      ctx.moveTo(p0.x, p0.y)
      ctx.lineTo(p1.x, p1.y)
      ctx.stroke()
    }

    // Close the stroke outline if path is closed
    if (closed) {
      const pLast = rotatePoint(
        points[points.length - 1].x,
        points[points.length - 1].y,
        cx,
        cy,
        alpha,
      )
      const pFirst = rotatePoint(points[0].x, points[0].y, cx, cy, alpha)
      const pressure = points[points.length - 1].pressure
      ctx.lineWidth = Math.max(0.5, pressure * strokeWidth * 2)
      ctx.beginPath()
      ctx.moveTo(pLast.x, pLast.y)
      ctx.lineTo(pFirst.x, pFirst.y)
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
  activeStroke: string
  activeFill: string
  activeStrokeWidth: number
}

export default function SymmetryCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const liveRef = useRef<StrokePoint[]>([])
  const isDrawingRef = useRef(false)
  const activePointerIdRef = useRef<number | null>(null)
  const activePointerTypeRef = useRef<string | null>(null)
  const fillPointerRef = useRef<{ x: number; y: number } | null>(null)

  const rs = useRef<RenderState>({
    objects: useStore.getState().objects,
    symmetrySteps: useStore.getState().symmetrySteps,
    cx: useStore.getState().symmetryCenter?.x ?? window.innerWidth / 2,
    cy: useStore.getState().symmetryCenter?.y ?? window.innerHeight / 2,
    selectedTool: useStore.getState().selectedTool,
    activeStroke: useStore.getState().activeStroke,
    activeFill: useStore.getState().activeFill,
    activeStrokeWidth: useStore.getState().activeStrokeWidth,
  })

  const addPath = useStore((s) => s.addPath)
  const applyBucketFill = useStore((s) => s.applyBucketFill)
  const selectedTool = useStore((s) => s.selectedTool)

  useEffect(
    () =>
      useStore.subscribe((s) => {
        rs.current.objects = s.objects
        rs.current.symmetrySteps = s.symmetrySteps
        rs.current.cx = s.symmetryCenter?.x ?? window.innerWidth / 2
        rs.current.cy = s.symmetryCenter?.y ?? window.innerHeight / 2
        rs.current.selectedTool = s.selectedTool
        rs.current.activeStroke = s.activeStroke
        rs.current.activeFill = s.activeFill
        rs.current.activeStrokeWidth = s.activeStrokeWidth
      }),
    [],
  )

  useEffect(() => {
    if (selectedTool !== 'draw') {
      liveRef.current = []
      isDrawingRef.current = false
    }
    if (selectedTool !== 'fill') {
      fillPointerRef.current = null
    }
  }, [selectedTool])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const applySize = () => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.round(window.innerWidth * dpr)
      canvas.height = Math.round(window.innerHeight * dpr)
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
      if (!useStore.getState().symmetryCenter) {
        rs.current.cx = window.innerWidth / 2
        rs.current.cy = window.innerHeight / 2
      }
    }

    applySize()
    window.addEventListener('resize', applySize)
    return () => window.removeEventListener('resize', applySize)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let rafId: number

    const render = () => {
      const dpr = window.devicePixelRatio || 1
      const ctx = canvas.getContext('2d')!
      const w = window.innerWidth
      const h = window.innerHeight
      const {
        objects,
        symmetrySteps,
        cx,
        cy,
        selectedTool,
        activeStroke,
        activeFill,
        activeStrokeWidth,
      } = rs.current

      ctx.save()
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      // White canvas background
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, w, h)

      drawGrid(ctx, w, h)

      for (const obj of objects) {
        if (obj.type === 'path') {
          drawStroke(
            ctx,
            obj.points,
            obj.steps,
            obj.centerX,
            obj.centerY,
            obj.style.stroke,
            obj.style.strokeWidth,
            obj.style.fill,
            obj.closed,
          )
        }
      }

      if (liveRef.current.length >= 2) {
        drawStroke(
          ctx,
          liveRef.current,
          symmetrySteps,
          cx,
          cy,
          activeStroke,
          activeStrokeWidth,
          'none',
          false,
        )
      }

      if (selectedTool === 'draw') {
        drawGuides(ctx, cx, cy, symmetrySteps, w, h)
      }

      if (selectedTool === 'fill' && fillPointerRef.current) {
        drawFillCursor(
          ctx,
          fillPointerRef.current.x,
          fillPointerRef.current.y,
          activeFill,
          activeStroke,
        )
      }

      ctx.restore()
      rafId = requestAnimationFrame(render)
    }

    rafId = requestAnimationFrame(render)
    return () => cancelAnimationFrame(rafId)
  }, [])

  // ── Pointer handlers ──────────────────────────────────────────────────

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (rs.current.selectedTool === 'fill') {
        fillPointerRef.current = { x: e.clientX, y: e.clientY }
        applyBucketFill({ x: e.clientX, y: e.clientY })
        return
      }

      if (rs.current.selectedTool !== 'draw') return

      if (activePointerIdRef.current !== null) {
        if (e.pointerType === 'pen' && activePointerTypeRef.current === 'touch') {
          liveRef.current = []
          isDrawingRef.current = false
        } else {
          return
        }
      }

      e.currentTarget.setPointerCapture(e.pointerId)
      activePointerIdRef.current = e.pointerId
      activePointerTypeRef.current = e.pointerType
      isDrawingRef.current = true
      liveRef.current = [{ x: e.clientX, y: e.clientY, pressure: e.pressure || 0.5 }]
    },
    [applyBucketFill],
  )

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (rs.current.selectedTool === 'fill') {
      fillPointerRef.current = { x: e.clientX, y: e.clientY }
      return
    }

    if (!isDrawingRef.current) return
    if (e.pointerId !== activePointerIdRef.current) return

    const evts = (e.nativeEvent as PointerEvent).getCoalescedEvents?.() ?? [e.nativeEvent]
    for (const ev of evts) {
      liveRef.current.push({ x: ev.clientX, y: ev.clientY, pressure: ev.pressure || 0.5 })
    }
  }, [])

  const onPointerLeave = useCallback(() => {
    fillPointerRef.current = null
  }, [])

  const finishStroke = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (e.pointerId !== activePointerIdRef.current) return
      activePointerIdRef.current = null
      activePointerTypeRef.current = null

      if (!isDrawingRef.current) return
      isDrawingRef.current = false

      const pts = liveRef.current.slice()
      liveRef.current = []
      if (pts.length < 2) return

      const { cx, cy, symmetrySteps, activeStroke, activeStrokeWidth } = rs.current

      const closed = isStrokeClosed(pts, activeStrokeWidth)

      addPath({
        id: generateId(),
        type: 'path',
        points: pts,
        steps: symmetrySteps,
        centerX: cx,
        centerY: cy,
        closed,
        style: {
          stroke: activeStroke,
          strokeWidth: activeStrokeWidth,
          fill: 'none',
          opacity: 1,
        },
      })
    },
    [addPath],
  )

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0"
      style={{
        touchAction: 'none',
        pointerEvents: selectedTool === 'draw' || selectedTool === 'fill' ? 'auto' : 'none',
        cursor:
          selectedTool === 'draw'
            ? 'crosshair'
            : selectedTool === 'fill'
              ? 'none'
              : 'default',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onPointerUp={finishStroke}
      onPointerCancel={finishStroke}
    />
  )
}
