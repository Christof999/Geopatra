import type { FillRun, GeoFillRegion, GeoObject, GeoPath, Point } from '../types'
import { generateId, rotatePoint } from './geometry'
import { resolveFillStyle } from './canvasFill'

const WALL_ALPHA_THRESHOLD = 8
const WALL_PADDING = 4
const MASK_DILATION_PASSES = 2
const MAX_SEED_SEARCH_RADIUS = 14
const MAX_SEED_CANDIDATES = 96
const MIN_REGION_PIXELS = 4
const FILL_OVERLAP_PADDING = MASK_DILATION_PASSES + 1
const renderedFillCache = new Map<string, HTMLCanvasElement>()

type Seed = { x: number; y: number }
type SeedCandidate = Seed & { distanceSq: number }

function drawPathWalls(ctx: CanvasRenderingContext2D, path: GeoPath) {
  if (path.points.length < 2) return

  ctx.strokeStyle = '#000000'
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  for (let step = 0; step < path.steps; step++) {
    const alpha = (step / path.steps) * Math.PI * 2

    for (let i = 1; i < path.points.length; i++) {
      const p0 = rotatePoint(
        path.points[i - 1].x,
        path.points[i - 1].y,
        path.centerX,
        path.centerY,
        alpha,
      )
      const p1 = rotatePoint(
        path.points[i].x,
        path.points[i].y,
        path.centerX,
        path.centerY,
        alpha,
      )
      const pressure = (path.points[i - 1].pressure + path.points[i].pressure) / 2
      ctx.lineWidth = Math.max(1, pressure * path.style.strokeWidth * 2 + WALL_PADDING)
      ctx.beginPath()
      ctx.moveTo(p0.x, p0.y)
      ctx.lineTo(p1.x, p1.y)
      ctx.stroke()
    }

    if (path.closed) {
      const pLast = rotatePoint(
        path.points[path.points.length - 1].x,
        path.points[path.points.length - 1].y,
        path.centerX,
        path.centerY,
        alpha,
      )
      const pFirst = rotatePoint(
        path.points[0].x,
        path.points[0].y,
        path.centerX,
        path.centerY,
        alpha,
      )
      ctx.lineWidth = Math.max(
        1,
        path.points[path.points.length - 1].pressure * path.style.strokeWidth * 2 + WALL_PADDING,
      )
      ctx.beginPath()
      ctx.moveTo(pLast.x, pLast.y)
      ctx.lineTo(pFirst.x, pFirst.y)
      ctx.stroke()
    }
  }
}

function drawObjectWalls(ctx: CanvasRenderingContext2D, obj: GeoObject) {
  if (obj.type === 'path') {
    drawPathWalls(ctx, obj)
    return
  }

  if (obj.type === 'line') {
    ctx.strokeStyle = '#000000'
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = Math.max(1, obj.style.strokeWidth + WALL_PADDING)
    ctx.beginPath()
    ctx.moveTo(obj.x1, obj.y1)
    ctx.lineTo(obj.x2, obj.y2)
    ctx.stroke()
    return
  }

  if (obj.type === 'circle') {
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = Math.max(1, obj.style.strokeWidth + WALL_PADDING)
    ctx.beginPath()
    ctx.arc(obj.cx, obj.cy, obj.r, 0, Math.PI * 2)
    ctx.stroke()
  }
}

function buildWallMask(objects: GeoObject[], width: number, height: number): Uint8Array {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!

  ctx.clearRect(0, 0, width, height)
  for (const obj of objects) {
    if (obj.type === 'fillRegion') continue
    drawObjectWalls(ctx, obj)
  }

  const data = ctx.getImageData(0, 0, width, height).data
  const wall = new Uint8Array(width * height)
  for (let i = 0, p = 0; i < wall.length; i++, p += 4) {
    wall[i] = data[p + 3] > WALL_ALPHA_THRESHOLD ? 1 : 0
  }
  return wall
}

function dilateWallMask(
  wall: Uint8Array,
  width: number,
  height: number,
  passes: number,
): Uint8Array {
  let current = wall

  for (let pass = 0; pass < passes; pass++) {
    const next = current.slice()

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = y * width + x
        if (current[index] === 0) continue

        for (let dy = -1; dy <= 1; dy++) {
          const ny = y + dy
          if (ny < 0 || ny >= height) continue

          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx
            if (nx < 0 || nx >= width) continue
            next[ny * width + nx] = 1
          }
        }
      }
    }

    current = next
  }

  return current
}

function findSeedCandidates(
  wall: Uint8Array,
  width: number,
  height: number,
  point: Point,
): Seed[] {
  const sx = Math.floor(point.x)
  const sy = Math.floor(point.y)
  if (sx < 0 || sx >= width || sy < 0 || sy >= height) return []

  const startIndex = sy * width + sx
  if (wall[startIndex] === 0) return [{ x: sx, y: sy }]

  const seen = new Set<number>()
  const candidates: SeedCandidate[] = []

  for (let radius = 1; radius <= MAX_SEED_SEARCH_RADIUS; radius++) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue
        const x = sx + dx
        const y = sy + dy
        if (x < 0 || x >= width || y < 0 || y >= height) continue
        const index = y * width + x
        if (wall[index] !== 0 || seen.has(index)) continue

        seen.add(index)
        candidates.push({ x, y, distanceSq: dx * dx + dy * dy })
      }
    }
  }

  return candidates
    .sort((a, b) => a.distanceSq - b.distanceSq)
    .slice(0, MAX_SEED_CANDIDATES)
    .map(({ x, y }) => ({ x, y }))
}

function isOpenPixel(
  wall: Uint8Array,
  visited: Uint8Array,
  width: number,
  x: number,
  y: number,
): boolean {
  const index = y * width + x
  return wall[index] === 0 && visited[index] === 0
}

function floodFillRuns(
  wall: Uint8Array,
  width: number,
  height: number,
  seed: Seed,
): FillRun[] | null {
  const visited = new Uint8Array(width * height)
  const stack: Seed[] = [seed]
  const runs: FillRun[] = []
  let pixelCount = 0
  let touchesEdge = false

  while (stack.length > 0) {
    const { x, y } = stack.pop()!
    if (x < 0 || x >= width || y < 0 || y >= height) continue
    if (!isOpenPixel(wall, visited, width, x, y)) continue

    let xStart = x
    while (xStart > 0 && isOpenPixel(wall, visited, width, xStart - 1, y)) {
      xStart--
    }

    let xEnd = xStart
    let spanUp = false
    let spanDown = false

    while (xEnd < width && isOpenPixel(wall, visited, width, xEnd, y)) {
      const index = y * width + xEnd
      visited[index] = 1
      pixelCount++

      if (xEnd === 0 || xEnd === width - 1 || y === 0 || y === height - 1) {
        touchesEdge = true
      }

      if (y > 0) {
        if (isOpenPixel(wall, visited, width, xEnd, y - 1)) {
          if (!spanUp) {
            stack.push({ x: xEnd, y: y - 1 })
            spanUp = true
          }
        } else {
          spanUp = false
        }
      }

      if (y < height - 1) {
        if (isOpenPixel(wall, visited, width, xEnd, y + 1)) {
          if (!spanDown) {
            stack.push({ x: xEnd, y: y + 1 })
            spanDown = true
          }
        } else {
          spanDown = false
        }
      }

      xEnd++
    }

    runs.push([y, xStart, xEnd])
  }

  if (touchesEdge || pixelCount < MIN_REGION_PIXELS) return null
  return runs
}

function expandRuns(
  runs: FillRun[],
  width: number,
  height: number,
  padding: number,
): FillRun[] {
  const byRow = new Map<number, Array<[number, number]>>()

  for (const [y, xStart, xEnd] of runs) {
    for (let dy = -padding; dy <= padding; dy++) {
      const row = y + dy
      if (row < 0 || row >= height) continue

      const start = Math.max(0, xStart - padding)
      const end = Math.min(width, xEnd + padding)
      if (start >= end) continue

      const rowRuns = byRow.get(row)
      if (rowRuns) {
        rowRuns.push([start, end])
      } else {
        byRow.set(row, [[start, end]])
      }
    }
  }

  const expanded: FillRun[] = []
  const rows = Array.from(byRow.keys()).sort((a, b) => a - b)
  for (const row of rows) {
    const rowRuns = byRow.get(row)!
    rowRuns.sort((a, b) => a[0] - b[0])

    let [mergedStart, mergedEnd] = rowRuns[0]
    for (let i = 1; i < rowRuns.length; i++) {
      const [start, end] = rowRuns[i]
      if (start <= mergedEnd) {
        mergedEnd = Math.max(mergedEnd, end)
      } else {
        expanded.push([row, mergedStart, mergedEnd])
        mergedStart = start
        mergedEnd = end
      }
    }
    expanded.push([row, mergedStart, mergedEnd])
  }

  return expanded
}

export function createBucketFillRegion(
  objects: GeoObject[],
  point: Point,
  fill: string,
  stroke: string,
  width: number,
  height: number,
): GeoFillRegion | null {
  const maskWidth = Math.max(1, Math.round(width))
  const maskHeight = Math.max(1, Math.round(height))
  const wall = dilateWallMask(
    buildWallMask(objects, maskWidth, maskHeight),
    maskWidth,
    maskHeight,
    MASK_DILATION_PASSES,
  )
  const seeds = findSeedCandidates(wall, maskWidth, maskHeight, point)
  if (seeds.length === 0) return null

  for (const seed of seeds) {
    const runs = floodFillRuns(wall, maskWidth, maskHeight, seed)
    if (!runs) continue

    return {
      id: generateId(),
      type: 'fillRegion',
      width: maskWidth,
      height: maskHeight,
      runs: expandRuns(runs, maskWidth, maskHeight, FILL_OVERLAP_PADDING),
      style: {
        stroke,
        strokeWidth: 0,
        fill,
        opacity: 1,
      },
    }
  }

  return null
}

export function fillRegionContainsPoint(region: GeoFillRegion, point: Point): boolean {
  const x = Math.floor(point.x)
  const y = Math.floor(point.y)
  if (x < 0 || x >= region.width || y < 0 || y >= region.height) return false

  for (const [runY, xStart, xEnd] of region.runs) {
    if (runY === y && x >= xStart && x < xEnd) return true
  }

  return false
}

export function drawFillRegion(
  ctx: CanvasRenderingContext2D,
  region: GeoFillRegion,
  stencilMode = false,
) {
  const cacheKey = [
    region.id,
    region.width,
    region.height,
    region.runs.length,
    region.style.fill,
    region.style.stroke,
    stencilMode ? 'stencil' : 'screen',
  ].join('|')
  const cached = renderedFillCache.get(cacheKey)
  if (cached) {
    ctx.save()
    ctx.globalAlpha *= region.style.opacity
    ctx.drawImage(cached, 0, 0)
    ctx.restore()
    return
  }

  const fill = stencilMode
    ? region.style.fill.startsWith('pat:')
      ? region.style.fill
      : '#000000'
    : region.style.fill

  const offscreen = document.createElement('canvas')
  offscreen.width = region.width
  offscreen.height = region.height
  const offscreenCtx = offscreen.getContext('2d')!
  const fs = resolveFillStyle(offscreenCtx, fill, stencilMode ? '#000000' : region.style.stroke)
  if (fs === 'none') return

  offscreenCtx.fillStyle = fs
  offscreenCtx.fillRect(0, 0, region.width, region.height)

  offscreenCtx.globalCompositeOperation = 'destination-in'
  offscreenCtx.fillStyle = '#000000'
  for (const [y, xStart, xEnd] of region.runs) {
    offscreenCtx.fillRect(xStart, y, xEnd - xStart, 1)
  }

  ctx.save()
  ctx.globalAlpha *= region.style.opacity
  ctx.drawImage(offscreen, 0, 0)
  ctx.restore()
  renderedFillCache.set(cacheKey, offscreen)
}
