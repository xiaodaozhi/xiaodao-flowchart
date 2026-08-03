export type NodeType = 'rectangle' | 'diamond' | 'ellipse' | 'parallelogram' | 'text'

export type AnchorPosition = 'top' | 'right' | 'bottom' | 'left'

export type ResizeHandleId =
  | 'top-left' | 'top-center' | 'top-right'
  | 'middle-left' | 'middle-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right'

export interface NodeStyle {
  backgroundColor?: string
  borderColor?: string
  borderWidth?: number
  textColor?: string
  fontSize?: number
  borderRadius?: number
  opacity?: number
}

export interface FlowchartNode {
  id: string
  type: NodeType
  x: number
  y: number
  width: number
  height: number
  label: string
  style?: NodeStyle
}

export interface EdgeStyle {
  strokeColor?: string
  strokeWidth?: number
  cornerRadius?: number
}

export interface FlowchartEdge {
  id: string
  sourceNodeId: string
  sourceAnchor: AnchorPosition
  targetNodeId: string
  targetAnchor: AnchorPosition
  label?: string
  style?: EdgeStyle
}

export interface FlowchartData {
  nodes: FlowchartNode[]
  edges: FlowchartEdge[]
}

export interface SidebarNodeTemplate {
  type: NodeType
  label: string
  defaultWidth: number
  defaultHeight: number
}

export interface CanvasViewport {
  panX: number
  panY: number
  zoom: number
}

export interface SelectionState {
  selectedNodeId: string | null
  selectedEdgeId: string | null
}

export interface EdgeDrawingState {
  active: boolean
  sourceNodeId: string
  sourceAnchor: AnchorPosition
  currentMouseX: number
  currentMouseY: number
}

export interface ResizeDragState {
  active: boolean
  nodeId: string
  handle: ResizeHandleId
  startPointerX: number
  startPointerY: number
  startX: number
  startY: number
  startWidth: number
  startHeight: number
}

export const DEFAULT_NODE_STYLE: Required<NodeStyle> = {
  backgroundColor: '#FFFFFF',
  borderColor: '#333333',
  borderWidth: 2,
  textColor: '#000000',
  fontSize: 14,
  borderRadius: 4,
  opacity: 1,
}

export const DEFAULT_EDGE_STYLE: Required<EdgeStyle> = {
  strokeColor: '#555555',
  strokeWidth: 2,
  cornerRadius: 8,
}

export const MIN_NODE_WIDTH = 40
export const MIN_NODE_HEIGHT = 30

export const MIN_ZOOM = 0.1
export const MAX_ZOOM = 10.0
export const ZOOM_STEP = 1.08

export const GRID_SIZE = 15
export const BASE_GRID_SIZE = 15
