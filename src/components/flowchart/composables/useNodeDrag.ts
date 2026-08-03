import type { Ref } from 'vue';
import type { CanvasViewport } from '../types';
import { snapToGrid } from '.././utils/geometry';
import { GRID_SIZE } from '../types';

export function useNodeDrag(
  setNodePosition: (id: string, x: number, y: number) => void,
  viewport: Ref<CanvasViewport>,
) {
  let draggingNodeId: string | null = null;
  let startX = 0;
  let startY = 0;
  let nodeStartX = 0;
  let nodeStartY = 0;
  function startDrag(nodeId: string, nodeX: number, nodeY: number, pointerX: number, pointerY: number) {
    draggingNodeId = nodeId;
    startX = pointerX;
    startY = pointerY;
    nodeStartX = nodeX;
    nodeStartY = nodeY;
  }

  function onPointerMove(pointerX: number, pointerY: number, shiftKey: boolean) {
    if (!draggingNodeId) return;

    const dx = (pointerX - startX) / viewport.value.zoom;
    const dy = (pointerY - startY) / viewport.value.zoom;
    let newX = nodeStartX + dx;
    let newY = nodeStartY + dy;

    if (!shiftKey) {
      newX = snapToGrid(newX, GRID_SIZE);
      newY = snapToGrid(newY, GRID_SIZE);
    }

    setNodePosition(draggingNodeId, newX, newY);
  }

  function endDrag() {
    draggingNodeId = null;
  }

  function isDragging(): boolean {
    return draggingNodeId !== null;
  }

  function getDraggingNodeId(): string | null {
    return draggingNodeId;
  }

  return {
    startDrag,
    onPointerMove,
    endDrag,
    isDragging,
    getDraggingNodeId,
  };
}
