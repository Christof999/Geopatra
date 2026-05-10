import type { GeoObject, GeoPath, Point } from '../types'

export function euclidean(a: Point, b: Point): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  return Math.sqrt(dx * dx + dy * dy)
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

/** Ray casting — Punkt in einfachem Polygon (Kontur = Pfadpunkte). */
export function pointInPolygon(px: number, py: number, poly: Point[]): boolean {
  if (poly.length < 3) return false
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x
    const yi = poly[i].y
    const xj = poly[j].x
    const yj = poly[j].y
    const cross = (yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-12) + xi
    if (cross) inside = !inside
  }
  return inside
}

/** True wenn (px,py) im Inneren einer geschlossenen Pfadkontur liegt (inkl. aller Symmetrie-Kopien). */
export function pointInClosedPath(px: number, py: number, path: GeoPath): boolean {
  if (!path.closed || path.points.length < 3) return false
  const { centerX, centerY, steps, points } = path
  for (let s = 0; s < steps; s++) {
    const alpha = (s / steps) * Math.PI * 2
    const poly = points.map((p) => rotatePoint(p.x, p.y, centerX, centerY, alpha))
    if (pointInPolygon(px, py, poly)) return true
  }
  return false
}
