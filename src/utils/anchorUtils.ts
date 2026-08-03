import type { FlowchartNode, AnchorPosition } from '../types'
import type { Point } from './geometry'

const PARALLELOGRAM_SKEW_RATIO = 0.15
const ANCHOR_OFFSET = 10 // pixels outside the node

/** Anchor point ON the node edge (used for edge routing). */
export function getAnchorPoint(node: FlowchartNode, anchor: AnchorPosition): Point {
  const skew = node.type === 'parallelogram' ? Math.min(15, node.width * PARALLELOGRAM_SKEW_RATIO) : 0

  switch (anchor) {
    case 'top':
      return { x: node.x + node.width / 2 + skew / 2, y: node.y }
    case 'right':
      return { x: node.x + node.width, y: node.y + node.height / 2 }
    case 'bottom':
      return { x: node.x + node.width / 2 - skew / 2, y: node.y + node.height }
    case 'left':
      return { x: node.x, y: node.y + node.height / 2 }
  }
}

/** Anchor point OFFSET outside the node edge (used for rendering anchor circles). */
export function getAnchorDisplayPoint(node: FlowchartNode, anchor: AnchorPosition): Point {
  const pt = getAnchorPoint(node, anchor)
  switch (anchor) {
    case 'top':    return { x: pt.x, y: pt.y - ANCHOR_OFFSET }
    case 'right':  return { x: pt.x + ANCHOR_OFFSET, y: pt.y }
    case 'bottom': return { x: pt.x, y: pt.y + ANCHOR_OFFSET }
    case 'left':   return { x: pt.x - ANCHOR_OFFSET, y: pt.y }
  }
}

export function getDirectionVector(anchor: AnchorPosition): Point {
  switch (anchor) {
    case 'top':    return { x: 0, y: -1 }
    case 'right':  return { x: 1, y: 0 }
    case 'bottom': return { x: 0, y: 1 }
    case 'left':   return { x: -1, y: 0 }
  }
}
