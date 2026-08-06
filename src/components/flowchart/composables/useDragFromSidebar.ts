import { computed, type ComputedRef } from 'vue';
import type { NodeType, SidebarNodeTemplate } from '../types';
import { snapToGrid } from '.././utils/geometry';
import { BASE_GRID_SIZE } from '../types';
import type { createI18n } from './useFlowchartI18n';

type I18n = ReturnType<typeof createI18n>;

export function useDragFromSidebar(
  addNode: (type: NodeType, x: number, y: number, w: number, h: number) => string,
  i18n?: ComputedRef<I18n>,
) {
  const templates = computed<SidebarNodeTemplate[]>(() => {
    const t = i18n?.value;
    return [
      { type: 'rectangle', label: t?.t('template.rectangle') ?? '矩形', defaultWidth: 160, defaultHeight: 80 },
      { type: 'diamond', label: t?.t('template.diamond') ?? '菱形', defaultWidth: 120, defaultHeight: 120 },
      { type: 'ellipse', label: t?.t('template.ellipse') ?? '椭圆', defaultWidth: 160, defaultHeight: 100 },
      { type: 'parallelogram', label: t?.t('template.parallelogram') ?? '平行四边形', defaultWidth: 160, defaultHeight: 80 },
      { type: 'text', label: t?.t('template.text') ?? '文字', defaultWidth: 200, defaultHeight: 40 },
    ];
  });

  function getTemplate(type: NodeType): SidebarNodeTemplate | undefined {
    return templates.value.find((t) => t.type === type);
  }

  function createNodeAt(nodeType: NodeType, canvasX: number, canvasY: number, snapSize?: number): string | null {
    if (!nodeType) return null;

    const template = getTemplate(nodeType);
    if (!template) return null;

    const ss = snapSize ?? BASE_GRID_SIZE;

    // Snap position and size to the current grid
    const x = snapToGrid(canvasX - template.defaultWidth / 2, ss);
    const y = snapToGrid(canvasY - template.defaultHeight / 2, ss);
    const w = snapToGrid(template.defaultWidth, ss);
    const h = snapToGrid(template.defaultHeight, ss);

    return addNode(nodeType, x, y, w, h);
  }

  function handleDrop(event: DragEvent, canvasX: number, canvasY: number, snapSize?: number): string | null {
    const nodeType = event.dataTransfer?.getData('application/x-flowchart-node-type') as NodeType | undefined;
    if (!nodeType) return null;
    return createNodeAt(nodeType, canvasX, canvasY, snapSize);
  }

  return {
    templates,
    createNodeAt,
    handleDrop,
  };
}
