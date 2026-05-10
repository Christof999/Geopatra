import { useEffect, useRef, useCallback } from 'react'
import { useStore } from '../store'
import { snap } from '../utils/geometry'
import type { Point } from '../types'

function getCursorClass(tool: string): string {
  switch (tool) {
    case 'point':
      return 'cursor-crosshair'
    case 'line':
      return 'cursor-crosshair'
    case 'circle':
      return 'cursor-crosshair'
    case 'fill':
      return 'cursor-cell'
    default:
      return 'cursor-default'
  }
}

export default function Canvas() {
  const svgRef = useRef<SVGSVGElement>(null)

  const {
    objects,
    selectedTool,
    snapThreshold,
    ghostPoint,
    pendingLine,
    pendingCircleCenter,
    setGhostPoint,
    handleCanvasClick,
  } = useStore()

  const getSVGPoint = useCallback((e: MouseEvent | React.MouseEvent): Point => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }, [])

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const raw = getSVGPoint(e)
      const { point } = snap(raw, objects, snapThreshold)
      setGhostPoint(point)
    },
    [getSVGPoint, objects, snapThreshold, setGhostPoint],
  )

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const raw = getSVGPoint(e)
      const { point } = snap(raw, objects, snapThreshold)
      handleCanvasClick(point)
    },
    [getSVGPoint, objects, snapThreshold, handleCanvasClick],
  )

  const handleMouseLeave = useCallback(() => {
    setGhostPoint(null)
  }, [setGhostPoint])

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    svg.addEventListener('mousemove', handleMouseMove)
    return () => svg.removeEventListener('mousemove', handleMouseMove)
  }, [handleMouseMove])

  const snappedGhost = ghostPoint
    ? snap(ghostPoint, objects, snapThreshold)
    : null
  const isSnapped = snappedGhost?.snapped ?? false

  const renderGhostPreview = () => {
    if (!ghostPoint) return null

    if (selectedTool === 'line' && pendingLine) {
      return (
        <line
          x1={pendingLine.x1}
          y1={pendingLine.y1}
          x2={ghostPoint.x}
          y2={ghostPoint.y}
          stroke="#1a1a1a"
          strokeWidth={1.5}
          strokeDasharray="4 4"
          opacity={0.5}
          pointerEvents="none"
        />
      )
    }

    if (selectedTool === 'circle' && pendingCircleCenter) {
      const dx = ghostPoint.x - pendingCircleCenter.x
      const dy = ghostPoint.y - pendingCircleCenter.y
      const r = Math.sqrt(dx * dx + dy * dy)
      return (
        <>
          <circle
            cx={pendingCircleCenter.x}
            cy={pendingCircleCenter.y}
            r={r}
            stroke="#1a1a1a"
            strokeWidth={1.5}
            fill="none"
            strokeDasharray="4 4"
            opacity={0.5}
            pointerEvents="none"
          />
          <line
            x1={pendingCircleCenter.x}
            y1={pendingCircleCenter.y}
            x2={ghostPoint.x}
            y2={ghostPoint.y}
            stroke="#1a1a1a"
            strokeWidth={1}
            strokeDasharray="2 3"
            opacity={0.3}
            pointerEvents="none"
          />
        </>
      )
    }

    return null
  }

  return (
    <svg
      ref={svgRef}
      className={`absolute inset-0 w-full h-full ${getCursorClass(selectedTool)}`}
      onClick={handleClick}
      onMouseLeave={handleMouseLeave}
    >
      {/* Committed objects */}
      {objects.map((obj) => {
        if (obj.type === 'point') {
          return (
            <circle
              key={obj.id}
              cx={obj.x}
              cy={obj.y}
              r={4}
              fill={obj.style.fill}
              stroke={obj.style.stroke}
              strokeWidth={obj.style.strokeWidth}
              opacity={obj.style.opacity}
            />
          )
        }
        if (obj.type === 'line') {
          return (
            <line
              key={obj.id}
              x1={obj.x1}
              y1={obj.y1}
              x2={obj.x2}
              y2={obj.y2}
              stroke={obj.style.stroke}
              strokeWidth={obj.style.strokeWidth}
              opacity={obj.style.opacity}
              strokeLinecap="round"
            />
          )
        }
        if (obj.type === 'circle') {
          return (
            <circle
              key={obj.id}
              cx={obj.cx}
              cy={obj.cy}
              r={obj.r}
              fill={obj.style.fill}
              stroke={obj.style.stroke}
              strokeWidth={obj.style.strokeWidth}
              opacity={obj.style.opacity}
            />
          )
        }
        return null
      })}

      {/* Ghost previews */}
      {renderGhostPreview()}

      {/* Pending anchor indicators */}
      {pendingLine && (
        <circle
          cx={pendingLine.x1}
          cy={pendingLine.y1}
          r={4}
          fill="#1a1a1a"
          opacity={0.9}
          pointerEvents="none"
        />
      )}
      {pendingCircleCenter && (
        <circle
          cx={pendingCircleCenter.x}
          cy={pendingCircleCenter.y}
          r={4}
          fill="#1a1a1a"
          opacity={0.9}
          pointerEvents="none"
        />
      )}

      {/* Snap indicator ring */}
      {ghostPoint && isSnapped && (
        <circle
          cx={ghostPoint.x}
          cy={ghostPoint.y}
          r={10}
          fill="none"
          stroke="#1a1a1a"
          strokeWidth={1.5}
          opacity={0.8}
          pointerEvents="none"
        />
      )}

      {/* Cursor crosshair dot */}
      {ghostPoint && (
        <circle
          cx={ghostPoint.x}
          cy={ghostPoint.y}
          r={isSnapped ? 4 : 3}
          fill={isSnapped ? '#1a1a1a' : '#9ca3af'}
          opacity={isSnapped ? 1 : 0.4}
          pointerEvents="none"
        />
      )}
    </svg>
  )
}
