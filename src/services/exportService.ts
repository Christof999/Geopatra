import { rotatePoint } from '../utils/geometry'
import { isPatternFill, resolveFillStyle } from '../utils/canvasFill'
import { getPathStepFill } from '../utils/pathFill'
import { drawFillRegion } from '../utils/fillRegion'
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

  // Schablonen-Export: transparenter Hintergrund (kein weißes Blatt).
  // Farbmodus: weißer Grund für bessere Lesbarkeit beim Druck / Galerie.
  if (!stencilMode) {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, targetWidth, targetHeight)
  }

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
    if (obj.type === 'fillRegion') {
      drawFillRegion(ctx, obj, stencilMode)
    }
  }

  for (const obj of objects) {
    if (obj.type === 'fillRegion') continue

    const stroke = stencilMode ? '#000000' : obj.style.stroke
    const fill = stencilMode ? obj.style.fill : obj.style.fill

    if (obj.type === 'point') {
      ctx.beginPath()
      ctx.arc(obj.x, obj.y, 4, 0, Math.PI * 2)
      ctx.fillStyle = stroke
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
      ctx.beginPath()
      ctx.arc(obj.cx, obj.cy, obj.r, 0, Math.PI * 2)
      if (fill !== 'none') {
        ctx.fillStyle = stencilMode ? '#000000' : fill
        ctx.fill()
      }
      ctx.stroke()
    } else if (obj.type === 'path') {
      const pathStroke = stroke
      const pathStrokeWidth = obj.style.strokeWidth
      const fillDotColor = stencilMode ? '#000000' : pathStroke

      for (let s = 0; s < obj.steps; s++) {
        const alpha = (s / obj.steps) * Math.PI * 2
        const pathFillRaw = getPathStepFill(obj, s)
        const pathFillStencil =
          obj.closed && pathFillRaw !== 'none'
            ? isPatternFill(pathFillRaw)
              ? pathFillRaw
              : '#000000'
            : 'none'
        const pathFill = stencilMode ? pathFillStencil : pathFillRaw

        // Fill pass
        if (pathFill !== 'none' && obj.closed) {
          ctx.beginPath()
          const fp = rotatePoint(
            obj.points[0].x,
            obj.points[0].y,
            obj.centerX,
            obj.centerY,
            alpha,
          )
          ctx.moveTo(fp.x, fp.y)
          for (let i = 1; i < obj.points.length; i++) {
            const p = rotatePoint(
              obj.points[i].x,
              obj.points[i].y,
              obj.centerX,
              obj.centerY,
              alpha,
            )
            ctx.lineTo(p.x, p.y)
          }
          ctx.closePath()
          const fs = resolveFillStyle(ctx, pathFill, fillDotColor)
          if (fs !== 'none') {
            ctx.fillStyle = fs
            ctx.fill()
          }
        }

        // Stroke pass — pressure-sensitive
        ctx.strokeStyle = pathStroke
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
          ctx.lineWidth = Math.max(0.5, pressure * pathStrokeWidth * 2)
          ctx.beginPath()
          ctx.moveTo(p0.x, p0.y)
          ctx.lineTo(p1.x, p1.y)
          ctx.stroke()
        }

        // Close stroke outline if path is closed
        if (obj.closed) {
          const pLast = rotatePoint(
            obj.points[obj.points.length - 1].x,
            obj.points[obj.points.length - 1].y,
            obj.centerX,
            obj.centerY,
            alpha,
          )
          const pFirst = rotatePoint(
            obj.points[0].x,
            obj.points[0].y,
            obj.centerX,
            obj.centerY,
            alpha,
          )
          ctx.lineWidth = Math.max(0.5, obj.points[obj.points.length - 1].pressure * pathStrokeWidth * 2)
          ctx.beginPath()
          ctx.moveTo(pLast.x, pLast.y)
          ctx.lineTo(pFirst.x, pFirst.y)
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

  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({
    orientation: widthCm >= heightCm ? 'landscape' : 'portrait',
    unit: 'cm',
    format: [widthCm, heightCm],
  })

  pdf.addImage(dataUrl, 'PNG', 0, 0, widthCm, heightCm)
  pdf.save(`tattoo-vorlage-${Date.now()}.pdf`)
}
