export type ToolType = 'point' | 'line' | 'circle'

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

export type GeoObject = GeoPoint | GeoLine | GeoCircle

export interface ShapeStyle {
  stroke: string
  strokeWidth: number
  fill: string
  opacity: number
}

export interface CanvasState {
  objects: GeoObject[]
  selectedTool: ToolType
  snapThreshold: number
  history: GeoObject[][]
  pendingLine: { x1: number; y1: number } | null
  pendingCircleCenter: { x: number; y: number } | null
  ghostPoint: Point | null
}
