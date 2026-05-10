/** Prefix for procedural dot / stipple fills (serialisable in saved designs). */
export const PATTERN_PREFIX = 'pat:'

export function isPatternFill(fill: string): boolean {
  return fill.startsWith(PATTERN_PREFIX)
}

function makeTile(
  size: number,
  draw: (tctx: CanvasRenderingContext2D, s: number) => void,
): HTMLCanvasElement {
  const tile = document.createElement('canvas')
  tile.width = size
  tile.height = size
  const tctx = tile.getContext('2d')!
  draw(tctx, size)
  return tile
}

/** Single-grid dot stipple (fein). */
function tileDotFine(color: string): HTMLCanvasElement {
  const s = 5
  return makeTile(s, (tctx, sz) => {
    tctx.fillStyle = color
    tctx.beginPath()
    tctx.arc(sz / 2, sz / 2, 0.65, 0, Math.PI * 2)
    tctx.fill()
  })
}

/** Größerer Abstand — grobe Punktarbeit. */
function tileDotCoarse(color: string): HTMLCanvasElement {
  const s = 10
  return makeTile(s, (tctx, sz) => {
    tctx.fillStyle = color
    tctx.beginPath()
    tctx.arc(sz / 2, sz / 2, 1.1, 0, Math.PI * 2)
    tctx.fill()
  })
}

/** Hexagonal / versetztes Doppelraster — typisch Mandala-Dotwork. */
function tileDotHex(color: string): HTMLCanvasElement {
  const s = 14
  return makeTile(s, (tctx, sz) => {
    tctx.fillStyle = color
    const r = 0.75
    const pts = [
      [sz * 0.25, sz * 0.25],
      [sz * 0.75, sz * 0.25],
      [sz * 0.5, sz * 0.5],
      [sz * 0.25, sz * 0.75],
      [sz * 0.75, sz * 0.75],
    ] as const
    for (const [x, y] of pts) {
      tctx.beginPath()
      tctx.arc(x, y, r, 0, Math.PI * 2)
      tctx.fill()
    }
  })
}

const patternMemo = new Map<string, CanvasPattern>()

function memoKey(fill: string, color: string): string {
  return `${fill}|${color}`
}

/**
 * Liefert `CanvasPattern` oder einen CSS-Farbstring für `ctx.fillStyle`.
 * `dotColor` — Vordergrundfarbe der Punkte (Schablone: Schwarz).
 */
export function resolveFillStyle(
  ctx: CanvasRenderingContext2D,
  fill: string,
  dotColor: string,
): string | CanvasPattern {
  if (fill === 'none') return 'none'

  if (!fill.startsWith(PATTERN_PREFIX)) {
    return fill
  }

  const key = memoKey(fill, dotColor)
  const cached = patternMemo.get(key)
  if (cached) return cached

  let tile: HTMLCanvasElement
  switch (fill) {
    case 'pat:dot-fine':
      tile = tileDotFine(dotColor)
      break
    case 'pat:dot-coarse':
      tile = tileDotCoarse(dotColor)
      break
    case 'pat:dot-mandala':
      tile = tileDotHex(dotColor)
      break
    default:
      return dotColor
  }

  const pat = ctx.createPattern(tile, 'repeat')
  if (!pat) return dotColor
  patternMemo.set(key, pat)
  return pat
}

/** Für Tests / Speicherlimits — Muster-Cache leeren (optional). */
export function clearFillPatternCache(): void {
  patternMemo.clear()
}
