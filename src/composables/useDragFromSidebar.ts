import { ref } from 'vue'
import type { NodeType, SidebarNodeTemplate } from '../types'
import { snapToGrid } from '../utils/geometry'
import { BASE_GRID_SIZE } from '../types'

const DEFAULT_TEMPLATES: SidebarNodeTemplate[] = [
  { type: 'rectangle', label: '矩形', defaultWidth: 160, defaultHeight: 80 },
  { type: 'diamond', label: '菱形', defaultWidth: 120, defaultHeight: 120 },
  { type: 'ellipse', label: '椭圆', defaultWidth: 160, defaultHeight: 100 },
  { type: 'parallelogram', label: '平行四边形', defaultWidth: 160, defaultHeight: 80 },
  { type: 'text', label: '文字', defaultWidth: 200, defaultHeight: 40 },
]

export function useDragFromSidebar(
  addNode: (type: NodeType, x: number, y: number, w: number, h: number) => string,
) {
  const templates = ref<SidebarNodeTemplate[]>(DEFAULT_TEMPLATES)

  function getTemplate(type: NodeType): SidebarNodeTemplate | undefined {
    return templates.value.find(t => t.type === type)
  }

  function handleDrop(event: DragEvent, canvasX: number, canvasY: number, snapSize?: number): string | null {
    const nodeType = event.dataTransfer?.getData('application/x-flowchart-node-type') as NodeType | undefined
    if (!nodeType) return null

    const template = getTemplate(nodeType)
    if (!template) return null

    const ss = snapSize ?? BASE_GRID_SIZE

    // Snap position and size to the current grid
    const x = snapToGrid(canvasX - template.defaultWidth / 2, ss)
    const y = snapToGrid(canvasY - template.defaultHeight / 2, ss)
    const w = snapToGrid(template.defaultWidth, ss)
    const h = snapToGrid(template.defaultHeight, ss)

    return addNode(nodeType, x, y, w, h)
  }

  return {
    templates,
    handleDrop,
  }
}
