import type { GeoObject, Point } from '../types'

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

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}
