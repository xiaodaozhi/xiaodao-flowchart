import type { Ref } from 'vue';
import type { ResizeHandleId, CanvasViewport } from '../types';
import { MIN_NODE_WIDTH, MIN_NODE_HEIGHT } from '../types';

export function useNodeResize(
  resizeNode: (id: string, x: number, y: number, width: number, height: number) => void,
  viewport: Ref<CanvasViewport>,
) {
  let nodeId: string | null = null;
  let handle: ResizeHandleId | null = null;
  let startPointerX = 0;
  let startPointerY = 0;
  let startX = 0;
  let startY = 0;
  let startWidth = 0;
  let startHeight = 0;

  function startResize(
    id: string,
    h: ResizeHandleId,
    pointerX: number,
    pointerY: number,
    nx: number,
    ny: number,
    nw: number,
    nh: number,
  ) {
    nodeId = id;
    handle = h;
    startPointerX = pointerX;
    startPointerY = pointerY;
    startX = nx;
    startY = ny;
    startWidth = nw;
    startHeight = nh;
  }

  function onPointerMove(pointerX: number, pointerY: number) {
    if (!nodeId || !handle) return;

    const dx = (pointerX - startPointerX) / viewport.value.zoom;
    const dy = (pointerY - startPointerY) / viewport.value.zoom;

    let newX = startX;
    let newY = startY;
    let newW = startWidth;
    let newH = startHeight;

    switch (handle) {
      case 'top-left':
        newX = startX + dx;
        newY = startY + dy;
        newW = startWidth - dx;
        newH = startHeight - dy;
        break;
      case 'top-center':
        newY = startY + dy;
        newH = startHeight - dy;
        break;
      case 'top-right':
        newY = startY + dy;
        newW = startWidth + dx;
        newH = startHeight - dy;
        break;
      case 'middle-left':
        newX = startX + dx;
        newW = startWidth - dx;
        break;
      case 'middle-right':
        newW = startWidth + dx;
        break;
      case 'bottom-left':
        newX = startX + dx;
        newW = startWidth - dx;
        newH = startHeight + dy;
        break;
      case 'bottom-center':
        newH = startHeight + dy;
        break;
      case 'bottom-right':
        newW = startWidth + dx;
        newH = startHeight + dy;
        break;
    }

    // Enforce minimum dimensions
    if (newW < MIN_NODE_WIDTH) {
      if (handle.includes('left')) {
        newX = startX + startWidth - MIN_NODE_WIDTH;
      }
      newW = MIN_NODE_WIDTH;
    }
    if (newH < MIN_NODE_HEIGHT) {
      if (handle.includes('top')) {
        newY = startY + startHeight - MIN_NODE_HEIGHT;
      }
      newH = MIN_NODE_HEIGHT;
    }

    resizeNode(nodeId, newX, newY, newW, newH);
  }

  function endResize() {
    nodeId = null;
    handle = null;
  }

  function isResizing(): boolean {
    return nodeId !== null;
  }

  return {
    startResize,
    onPointerMove,
    endResize,
    isResizing,
  };
}
