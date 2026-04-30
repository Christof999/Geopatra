export type ToolType = 'point' | 'line' | 'circle' | 'draw'

export interface Point {
  x: number
  y: number
}

export interface GeoPoint {
  id: string
  type: 'point'
  x: number
  y: number
  style: ShapeStyle
}

export interface GeoLine {
  id: string
  type: 'line'
  x1: number
  y1: number
  x2: number
  y2: number
  style: ShapeStyle
}

export interface GeoCircle {
  id: string
  type: 'circle'
  cx: number
  cy: number
  r: number
  style: ShapeStyle
}

export interface StrokePoint {
  x: number
  y: number
  pressure: number
}

export interface GeoPath {
  id: string
  type: 'path'
  points: StrokePoint[]
  steps: number
  centerX: number
  centerY: number
  closed: boolean
  style: ShapeStyle
}

export type GeoObject = GeoPoint | GeoLine | GeoCircle | GeoPath

export interface ShapeStyle {
  stroke: string
  strokeWidth: number
  fill: string
  opacity: number
}

// ── Saved design (Firestore document) ─────────────────────────────────────

export interface DesignDoc {
  id: string
  title: string
  createdAt: Date
  symmetrySteps: number
  objectsData: GeoObject[]
  thumbnailUrl: string
}

/** Shape of the raw Firestore document (before deserialisation) */
export interface DesignDocFirestore {
  title: string
  createdAt: unknown // Firestore Timestamp
  symmetrySteps: number
  objectsData: string // JSON-serialised GeoObject[]
  thumbnailUrl: string
}
