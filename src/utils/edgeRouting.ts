import type { AnchorPosition } from '../types'
import type { Point, Rect } from './geometry'

const EXIT_MARGIN = 40
const NODE_PADDING = 15

export interface NodeRect {
  id: string
  type: string
  x: number
  y: number
  width: number
  height: number
}

export function computeOrthogonalWaypoints(
  source: Point,
  sourceAnchor: AnchorPosition,
  target: Point,
  targetAnchor: AnchorPosition,
  allNodes?: NodeRect[],
  excludeNodeIds?: string[],
): Point[] {
  const points = buildBaseWaypoints(source, sourceAnchor, target, targetAnchor)
  if (allNodes && allNodes.length > 0) {
    return avoidNodes(points, allNodes, excludeNodeIds ?? [])
  }
  return points
}

function buildBaseWaypoints(
  source: Point,
  sourceAnchor: AnchorPosition,
  target: Point,
  targetAnchor: AnchorPosition,
): Point[] {
  const points: Point[] = [source]

  // --- Opposite anchors, aligned → straight line ---
  if (areOppositeAnchors(sourceAnchor, targetAnchor)) {
    if (isAligned(source, sourceAnchor, target)) {
      points.push(target)
      return points
    }
  }

  // --- Same-side anchors → go outward with margin ---
  if (areSameSideAnchors(sourceAnchor, targetAnchor)) {
    const margin = EXIT_MARGIN
    if (sourceAnchor === 'top' || sourceAnchor === 'bottom') {
      if (sourceAnchor === 'top') {
        const y = Math.min(source.y, target.y) - margin
        points.push({ x: source.x, y })
        points.push({ x: target.x, y })
      } else {
        const yBelow = Math.max(source.y, target.y) + margin
        points.push({ x: source.x, y: yBelow })
        points.push({ x: target.x, y: yBelow })
      }
    } else {
      if (sourceAnchor === 'left') {
        const x = Math.min(source.x, target.x) - margin
        points.push({ x, y: source.y })
        points.push({ x, y: target.y })
      } else {
        const xRight = Math.max(source.x, target.x) + margin
        points.push({ x: xRight, y: source.y })
        points.push({ x: xRight, y: target.y })
      }
    }
    points.push(target)
    return points
  }

  // --- General case: different-side anchors ---
  const srcDir = getDir(sourceAnchor)
  const tgtDir = getDir(targetAnchor)

  const p1: Point = {
    x: source.x + srcDir.x * EXIT_MARGIN,
    y: source.y + srcDir.y * EXIT_MARGIN,
  }
  points.push(p1)

  const pN: Point = {
    x: target.x + tgtDir.x * EXIT_MARGIN,
    y: target.y + tgtDir.y * EXIT_MARGIN,
  }

  if (isHorizontal(sourceAnchor)) {
    // Source exits horizontally (left or right)
    if (isHorizontal(targetAnchor)) {
      // Both horizontal — need a middle vertical segment
      const midY = (p1.y + pN.y) / 2
      points.push({ x: p1.x, y: midY })
      points.push({ x: pN.x, y: midY })
    } else {
      // Source horizontal, target vertical
      // Check if corner at (pN.x, p1.y) creates backtracking
      const cornerX = pN.x
      const cornerY = p1.y
      const backtracking =
        (srcDir.x > 0 && cornerX < p1.x) || (srcDir.x < 0 && cornerX > p1.x)

      if (backtracking) {
        // Go further out in source direction first, then route properly
        const extraX = p1.x + srcDir.x * EXIT_MARGIN
        points.push({ x: extraX, y: p1.y })
        points.push({ x: extraX, y: pN.y })
        points.push({ x: pN.x, y: pN.y })
      } else {
        points.push({ x: cornerX, y: cornerY })
      }
    }
  } else {
    // Source exits vertically (top or bottom)
    if (isHorizontal(targetAnchor)) {
      // Source vertical, target horizontal
      const cornerX = p1.x
      const cornerY = pN.y
      const backtracking =
        (srcDir.y > 0 && cornerY < p1.y) || (srcDir.y < 0 && cornerY > p1.y)

      if (backtracking) {
        const extraY = p1.y + srcDir.y * EXIT_MARGIN
        points.push({ x: p1.x, y: extraY })
        points.push({ x: pN.x, y: extraY })
        points.push({ x: pN.x, y: pN.y })
      } else {
        points.push({ x: cornerX, y: cornerY })
      }
    } else {
      // Both vertical — need a middle horizontal segment
      const midX = (p1.x + pN.x) / 2
      points.push({ x: midX, y: p1.y })
      points.push({ x: midX, y: pN.y })
    }
  }

  points.push(pN)
  points.push(target)
  return points
}

/**
 * Post-process waypoints to avoid crossing non-text nodes.
 */
function avoidNodes(points: Point[], nodes: NodeRect[], excludeIds: string[]): Point[] {
  const toAvoid = nodes.filter(
    n => n.type !== 'text' && !excludeIds.includes(n.id),
  )
  if (toAvoid.length === 0) return points

  let result = points

  for (const node of toAvoid) {
    const avoided: Point[] = [result[0]]
    for (let i = 1; i < result.length; i++) {
      const a = result[i - 1]
      const b = result[i]

      if (isHorizontalSegment(a, b)) {
        // Determine if node intersects this horizontal segment
        const sy = a.y
        const nodeTop = node.y - NODE_PADDING
        const nodeBottom = node.y + node.height + NODE_PADDING
        if (sy >= nodeTop && sy <= nodeBottom) {
          const segLeft = Math.min(a.x, b.x)
          const segRight = Math.max(a.x, b.x)
          const nLeft = node.x - NODE_PADDING
          const nRight = node.x + node.width + NODE_PADDING
          if (segLeft < nRight && segRight > nLeft) {
            // Intersection — route above or below
            const toTop = sy - nodeTop
            const toBottom = nodeBottom - sy
            const goAbove = toTop <= toBottom
            const offsetY = goAbove ? nodeTop : nodeBottom

            avoided.push({ x: a.x, y: a.y })
            if (a.x !== b.x) {
              avoided.push({ x: nLeft, y: a.y })
              avoided.push({ x: nLeft, y: offsetY })
              avoided.push({ x: nRight, y: offsetY })
              avoided.push({ x: nRight, y: a.y })
            }
            // Skip the `b` that was already handled (will be added on next iteration or at end)
            continue
          }
        }
        avoided.push(b)
      } else if (isVerticalSegment(a, b)) {
        const sx = a.x
        const nodeLeft = node.x - NODE_PADDING
        const nodeRight = node.x + node.width + NODE_PADDING
        if (sx >= nodeLeft && sx <= nodeRight) {
          const segTop = Math.min(a.y, b.y)
          const segBottom = Math.max(a.y, b.y)
          const nTop = node.y - NODE_PADDING
          const nBottom = node.y + node.height + NODE_PADDING
          if (segTop < nBottom && segBottom > nTop) {
            const toLeft = sx - nodeLeft
            const toRight = nodeRight - sx
            const goLeft = toLeft <= toRight
            const offsetX = goLeft ? nodeLeft : nodeRight

            avoided.push({ x: a.x, y: a.y })
            if (a.y !== b.y) {
              avoided.push({ x: a.x, y: nTop })
              avoided.push({ x: offsetX, y: nTop })
              avoided.push({ x: offsetX, y: nBottom })
              avoided.push({ x: a.x, y: nBottom })
            }
            continue
          }
        }
        avoided.push(b)
      } else {
        avoided.push(b)
      }
    }
    result = avoided
  }

  return result
}

function isHorizontalSegment(a: Point, b: Point): boolean {
  return Math.abs(a.y - b.y) < 0.5
}

function isVerticalSegment(a: Point, b: Point): boolean {
  return Math.abs(a.x - b.x) < 0.5
}

/** Build straight orthogonal path with no arcs */
export function buildRoundedPath(points: Point[], _cornerRadius: number): string {
  const cleaned: Point[] = [points[0]]
  for (let i = 1; i < points.length; i++) {
    const prev = cleaned[cleaned.length - 1]
    if (points[i].x !== prev.x || points[i].y !== prev.y) {
      cleaned.push(points[i])
    }
  }
  if (cleaned.length < 2) return ''
  let d = `M ${cleaned[0].x} ${cleaned[0].y}`
  for (let i = 1; i < cleaned.length; i++) {
    d += ` L ${cleaned[i].x} ${cleaned[i].y}`
  }
  return d
}

function getDir(anchor: AnchorPosition): Point {
  switch (anchor) {
    case 'top':    return { x: 0, y: -1 }
    case 'right':  return { x: 1, y: 0 }
    case 'bottom': return { x: 0, y: 1 }
    case 'left':   return { x: -1, y: 0 }
  }
}

function isHorizontal(anchor: AnchorPosition): boolean {
  return anchor === 'left' || anchor === 'right'
}

function areOppositeAnchors(a: AnchorPosition, b: AnchorPosition): boolean {
  return (
    (a === 'top' && b === 'bottom') ||
    (a === 'bottom' && b === 'top') ||
    (a === 'left' && b === 'right') ||
    (a === 'right' && b === 'left')
  )
}

function areSameSideAnchors(a: AnchorPosition, b: AnchorPosition): boolean {
  return a === b
}

function isAligned(
  source: Point,
  sourceAnchor: AnchorPosition,
  target: Point,
): boolean {
  if (sourceAnchor === 'left' || sourceAnchor === 'right') {
    return Math.abs(source.y - target.y) < 2
  }
  return Math.abs(source.x - target.x) < 2
}
