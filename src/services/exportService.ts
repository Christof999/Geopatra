import { rotatePoint } from '../utils/geometry'
import type { GeoObject } from '../types'

export const EXPORT_DPI = 300

/** pixels = (cm / 2.54) × DPI */
export function cmToPixels(cm: number, dpi = EXPORT_DPI): number {
  return Math.round((cm / 2.54) * dpi)
}

/** Reverse: cm = (pixels / DPI) × 2.54 */
export function pixelsToCm(px: number, dpi = EXPORT_DPI): number {
  return (px / dpi) * 2.54
}

// ── Core renderer ──────────────────────────────────────────────────────────

/**
 * Renders all GeoObjects onto an offscreen canvas.
 * Content is scaled + letterboxed to fill the target dimensions.
 */
export function renderObjectsToCanvas(
  objects: GeoObject[],
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  stencilMode: boolean,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = targetWidth
  canvas.height = targetHeight

  const ctx = canvas.getContext('2d')!

  // Background
  ctx.fillStyle = stencilMode ? '#ffffff' : '#0f0f11'
  ctx.fillRect(0, 0, targetWidth, targetHeight)

  // Scale to fit (letterbox, preserve aspect ratio)
  const scale = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight)
  const offsetX = (targetWidth - sourceWidth * scale) / 2
  const offsetY = (targetHeight - sourceHeight * scale) / 2

  ctx.save()
  ctx.translate(offsetX, offsetY)
  ctx.scale(scale, scale)

  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  for (const obj of objects) {
    const stroke = stencilMode ? '#000000' : obj.style.stroke
    const fill = stencilMode ? '#000000' : obj.style.fill

    if (obj.type === 'point') {
      ctx.beginPath()
      ctx.arc(obj.x, obj.y, 4, 0, Math.PI * 2)
      ctx.fillStyle = fill
      ctx.fill()
    } else if (obj.type === 'line') {
      ctx.strokeStyle = stroke
      ctx.lineWidth = obj.style.strokeWidth
      ctx.beginPath()
      ctx.moveTo(obj.x1, obj.y1)
      ctx.lineTo(obj.x2, obj.y2)
      ctx.stroke()
    } else if (obj.type === 'circle') {
      ctx.strokeStyle = stroke
      ctx.lineWidth = obj.style.strokeWidth
      ctx.fillStyle = 'none'
      ctx.beginPath()
      ctx.arc(obj.cx, obj.cy, obj.r, 0, Math.PI * 2)
      ctx.stroke()
    } else if (obj.type === 'path') {
      ctx.strokeStyle = stroke

      for (let s = 0; s < obj.steps; s++) {
        const alpha = (s / obj.steps) * Math.PI * 2

        for (let i = 1; i < obj.points.length; i++) {
          const p0 = rotatePoint(
            obj.points[i - 1].x,
            obj.points[i - 1].y,
            obj.centerX,
            obj.centerY,
            alpha,
          )
          const p1 = rotatePoint(
            obj.points[i].x,
            obj.points[i].y,
            obj.centerX,
            obj.centerY,
            alpha,
          )
          const pressure = (obj.points[i - 1].pressure + obj.points[i].pressure) / 2
          ctx.lineWidth = Math.max(0.5, pressure * 3.5)
          ctx.beginPath()
          ctx.moveTo(p0.x, p0.y)
          ctx.lineTo(p1.x, p1.y)
          ctx.stroke()
        }
      }
    }
  }

  ctx.restore()
  return canvas
}

// ── Public API ─────────────────────────────────────────────────────────────

/** 360×360 thumbnail data URL for gallery previews */
export function generateThumbnail(
  objects: GeoObject[],
  sourceWidth: number,
  sourceHeight: number,
): string {
  const canvas = renderObjectsToCanvas(objects, sourceWidth, sourceHeight, 360, 360, false)
  return canvas.toDataURL('image/png', 0.85)
}

/** Download a high-resolution PNG (300 DPI) */
export async function exportAsPNG(
  objects: GeoObject[],
  sourceWidth: number,
  sourceHeight: number,
  widthCm: number,
  heightCm: number,
  stencilMode: boolean,
): Promise<void> {
  const w = cmToPixels(widthCm)
  const h = cmToPixels(heightCm)
  const canvas = renderObjectsToCanvas(objects, sourceWidth, sourceHeight, w, h, stencilMode)

  const link = document.createElement('a')
  link.download = `tattoo-vorlage-${Date.now()}.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
}

/** Download a print-ready PDF at the specified physical size */
export async function exportAsPDF(
  objects: GeoObject[],
  sourceWidth: number,
  sourceHeight: number,
  widthCm: number,
  heightCm: number,
  stencilMode: boolean,
): Promise<void> {
  const w = cmToPixels(widthCm)
  const h = cmToPixels(heightCm)
  const canvas = renderObjectsToCanvas(objects, sourceWidth, sourceHeight, w, h, stencilMode)
  const dataUrl = canvas.toDataURL('image/png')

  // Dynamic import keeps jsPDF out of the initial bundle
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({
    orientation: widthCm >= heightCm ? 'landscape' : 'portrait',
    unit: 'cm',
    format: [widthCm, heightCm],
  })

  pdf.addImage(dataUrl, 'PNG', 0, 0, widthCm, heightCm)
  pdf.save(`tattoo-vorlage-${Date.now()}.pdf`)
}
