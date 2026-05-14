import type { GeoObject, GeoPath, Point, StrokePoint } from '../types'

const BASE_CLOSURE_TOLERANCE = 24
const MAX_CLOSURE_TOLERANCE = 48
const BOUNDARY_HIT_TOLERANCE = 1.5
const EPSILON = 1e-9

export function euclidean(a: Point, b: Point): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  return Math.sqrt(dx * dx + dy * dy)
}

export function distanceToSegment(point: Point, a: Point, b: Point): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lenSq = dx * dx + dy * dy

  if (lenSq === 0) return euclidean(point, a)

  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lenSq))
  return euclidean(point, { x: a.x + t * dx, y: a.y + t * dy })
}

/** Returns the nearest existing point if within threshold, else the raw cursor position. */
export function snap(
  cursor: Point,
  objects: GeoObject[],
  threshold: number,
): { point: Point; snapped: boolean } {
  let nearest: Point | null = null
  let minDist = Infinity

  for (const obj of objects) {
    const candidates = getAnchorPoints(obj)
    for (const candidate of candidates) {
      const d = euclidean(cursor, candidate)
      if (d < minDist) {
        minDist = d
        nearest = candidate
      }
    }
  }

  if (nearest && minDist < threshold) {
    return { point: nearest, snapped: true }
  }
  return { point: cursor, snapped: false }
}

/** Extracts all anchor points from a geometric object for snapping purposes. */
export function getAnchorPoints(obj: GeoObject): Point[] {
  switch (obj.type) {
    case 'point':
      return [{ x: obj.x, y: obj.y }]
    case 'line':
      return [
        { x: obj.x1, y: obj.y1 },
        { x: obj.x2, y: obj.y2 },
      ]
    case 'circle':
      return [
        { x: obj.cx, y: obj.cy },
        { x: obj.cx + obj.r, y: obj.cy },
        { x: obj.cx - obj.r, y: obj.cy },
        { x: obj.cx, y: obj.cy + obj.r },
        { x: obj.cx, y: obj.cy - obj.r },
      ]
    default:
      return []
  }
}

export function circleRadius(center: Point, edge: Point): number {
  return euclidean(center, edge)
}

/**
 * Rotates point (x, y) around center (cx, cy) by angle alpha (radians).
 * newX = cx + (x-cx)*cos(α) - (y-cy)*sin(α)
 * newY = cy + (x-cx)*sin(α) + (y-cy)*cos(α)
 */
export function rotatePoint(
  x: number,
  y: number,
  cx: number,
  cy: number,
  alpha: number,
): Point {
  const dx = x - cx
  const dy = y - cy
  return {
    x: cx + dx * Math.cos(alpha) - dy * Math.sin(alpha),
    y: cy + dx * Math.sin(alpha) + dy * Math.cos(alpha),
  }
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function closureTolerance(strokeWidth: number): number {
  const visualStrokeWidth = Math.max(0, strokeWidth) * 2
  return Math.max(
    BASE_CLOSURE_TOLERANCE,
    Math.min(MAX_CLOSURE_TOLERANCE, visualStrokeWidth * 4 + 12),
  )
}

function segmentOrientation(a: Point, b: Point, c: Point): number {
  return (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y)
}

function pointOnSegment(point: Point, a: Point, b: Point, tolerance: number): boolean {
  if (distanceToSegment(point, a, b) > tolerance) return false

  return (
    point.x >= Math.min(a.x, b.x) - tolerance &&
    point.x <= Math.max(a.x, b.x) + tolerance &&
    point.y >= Math.min(a.y, b.y) - tolerance &&
    point.y <= Math.max(a.y, b.y) + tolerance
  )
}

function segmentsIntersect(a: Point, b: Point, c: Point, d: Point): boolean {
  const o1 = segmentOrientation(a, b, c)
  const o2 = segmentOrientation(a, b, d)
  const o3 = segmentOrientation(c, d, a)
  const o4 = segmentOrientation(c, d, b)

  if (Math.abs(o1) < EPSILON && pointOnSegment(c, a, b, BOUNDARY_HIT_TOLERANCE)) return true
  if (Math.abs(o2) < EPSILON && pointOnSegment(d, a, b, BOUNDARY_HIT_TOLERANCE)) return true
  if (Math.abs(o3) < EPSILON && pointOnSegment(a, c, d, BOUNDARY_HIT_TOLERANCE)) return true
  if (Math.abs(o4) < EPSILON && pointOnSegment(b, c, d, BOUNDARY_HIT_TOLERANCE)) return true

  return (o1 > 0) !== (o2 > 0) && (o3 > 0) !== (o4 > 0)
}

function segmentDistance(a: Point, b: Point, c: Point, d: Point): number {
  if (segmentsIntersect(a, b, c, d)) return 0

  return Math.min(
    distanceToSegment(a, c, d),
    distanceToSegment(b, c, d),
    distanceToSegment(c, a, b),
    distanceToSegment(d, a, b),
  )
}

function asPoint(point: StrokePoint): Point {
  return { x: point.x, y: point.y }
}

export function isStrokeClosed(
  points: StrokePoint[],
  strokeWidth = 1.5,
): boolean {
  if (points.length < 3) return false

  const tolerance = closureTolerance(strokeWidth)
  const first = asPoint(points[0])
  const last = asPoint(points[points.length - 1])

  if (euclidean(first, last) <= tolerance) return true

  const segmentProbeCount = Math.max(2, Math.ceil(points.length * 0.12))
  const headEnd = Math.min(points.length - 3, segmentProbeCount - 1)
  const tailStart = Math.max(1, points.length - segmentProbeCount - 1)

  if (headEnd >= 0) {
    for (let i = 0; i <= headEnd; i++) {
      const a = asPoint(points[i])
      const b = asPoint(points[i + 1])
      if (distanceToSegment(last, a, b) <= tolerance) return true
    }
  }

  for (let i = tailStart; i < points.length - 1; i++) {
    const a = asPoint(points[i])
    const b = asPoint(points[i + 1])
    if (distanceToSegment(first, a, b) <= tolerance) return true
  }

  for (let head = 0; head <= headEnd; head++) {
    const headA = asPoint(points[head])
    const headB = asPoint(points[head + 1])

    for (let tail = tailStart; tail < points.length - 1; tail++) {
      if (tail <= head + 1) continue
      const tailA = asPoint(points[tail])
      const tailB = asPoint(points[tail + 1])
      if (segmentDistance(headA, headB, tailA, tailB) <= tolerance) return true
    }
  }

  return false
}

export function isPathFillable(path: GeoPath): boolean {
  return path.closed || isStrokeClosed(path.points, path.style.strokeWidth)
}

/** Ray casting — Punkt in einfachem Polygon (Kontur = Pfadpunkte). */
export function pointInPolygon(px: number, py: number, poly: Point[]): boolean {
  if (poly.length < 3) return false
  const point = { x: px, y: py }
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x
    const yi = poly[i].y
    const xj = poly[j].x
    const yj = poly[j].y

    if (pointOnSegment(point, poly[i], poly[j], BOUNDARY_HIT_TOLERANCE)) return true

    const cross = (yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-12) + xi
    if (cross) inside = !inside
  }
  return inside
}

/** Index der Symmetrie-Kopie, in deren geschlossener Pfadkontur (px,py) liegt. */
export function hitClosedPathStep(px: number, py: number, path: GeoPath): number | null {
  if (!isPathFillable(path) || path.points.length < 3) return null
  const { centerX, centerY, steps, points } = path
  for (let s = 0; s < steps; s++) {
    const alpha = (s / steps) * Math.PI * 2
    const poly = points.map((p) => rotatePoint(p.x, p.y, centerX, centerY, alpha))
    if (pointInPolygon(px, py, poly)) return s
  }
  return null
}

export function pointInClosedPath(px: number, py: number, path: GeoPath): boolean {
  return hitClosedPathStep(px, py, path) !== null
}
