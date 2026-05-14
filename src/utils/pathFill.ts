import type { GeoPath, PathStepFills } from '../types'

export function getPathStepFill(path: GeoPath, step: number): string {
  return path.stepFills ? path.stepFills[step] ?? 'none' : path.style.fill
}

export function createEditableStepFills(path: GeoPath): PathStepFills {
  const stepFills: PathStepFills = path.stepFills ? { ...path.stepFills } : {}

  if (!path.stepFills && path.style.fill !== 'none') {
    for (let step = 0; step < path.steps; step++) {
      stepFills[step] = path.style.fill
    }
  }

  return stepFills
}

export function setPathStepFill(path: GeoPath, step: number, fill: string): GeoPath {
  const stepFills = createEditableStepFills(path)

  if (fill === 'none') {
    delete stepFills[step]
  } else {
    stepFills[step] = fill
  }

  return {
    ...path,
    style: { ...path.style, fill: 'none' },
    stepFills,
  }
}
