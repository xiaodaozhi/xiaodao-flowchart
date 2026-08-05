import { ref, unref, type Ref } from 'vue';
import type { CanvasViewport, FlowchartNode } from '../types';
import { MIN_ZOOM, MAX_ZOOM } from '../types';
import { clamp } from '.././utils/geometry';

const ZOOM_STEP = 1.08;
const EDGE_PAD = 100;

export function useCanvasPanZoom(nodesRef: Ref<FlowchartNode[]>) {
  const viewport = ref<CanvasViewport>({ panX: 0, panY: 0, zoom: 1 });

  function applyPanClamp(zoom: number, containerWidth: number, containerHeight: number) {
    let ns: FlowchartNode[];
    try {
      ns = unref(nodesRef) ?? [];
    } catch {
      return;
    }

    if (ns.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of ns) {
      if (n.x < minX) minX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.x + n.width > maxX) maxX = n.x + n.width;
      if (n.y + n.height > maxY) maxY = n.y + n.height;
    }

    const leftEdge = minX - EDGE_PAD;
    const rightEdge = maxX + EDGE_PAD;
    const topEdge = minY - EDGE_PAD;
    const bottomEdge = maxY + EDGE_PAD;

    const contentW = (rightEdge - leftEdge) * zoom;
    const contentH = (bottomEdge - topEdge) * zoom;

    if (contentW > containerWidth) {
      const screenLeft = leftEdge * zoom + viewport.value.panX;
      const screenRight = rightEdge * zoom + viewport.value.panX;
      if (screenLeft > 0) viewport.value.panX = -leftEdge * zoom;
      else if (screenRight < containerWidth) viewport.value.panX = containerWidth - rightEdge * zoom;
    }

    if (contentH > containerHeight) {
      const screenTop = topEdge * zoom + viewport.value.panY;
      const screenBottom = bottomEdge * zoom + viewport.value.panY;
      if (screenTop > 0) viewport.value.panY = -topEdge * zoom;
      else if (screenBottom < containerHeight) viewport.value.panY = containerHeight - bottomEdge * zoom;
    }
  }

  function screenToCanvas(screenX: number, screenY: number, containerRect: DOMRect) {
    const x = (screenX - containerRect.left - viewport.value.panX) / viewport.value.zoom;
    const y = (screenY - containerRect.top - viewport.value.panY) / viewport.value.zoom;
    return { x, y };
  }

  function handleWheel(event: WheelEvent, containerRect: DOMRect) {
    event.preventDefault();
    const delta = event.deltaY > 0 ? 1 / ZOOM_STEP : ZOOM_STEP;
    const newZoom = clamp(viewport.value.zoom * delta, MIN_ZOOM, MAX_ZOOM);
    const cursorX = event.clientX - containerRect.left;
    const cursorY = event.clientY - containerRect.top;
    const scale = newZoom / viewport.value.zoom;
    viewport.value.panX = cursorX - (cursorX - viewport.value.panX) * scale;
    viewport.value.panY = cursorY - (cursorY - viewport.value.panY) * scale;
    viewport.value.zoom = newZoom;

    applyPanClamp(newZoom, containerRect.width, containerRect.height);
  }

  function resetView(containerWidth: number, containerHeight: number) {
    let ns: FlowchartNode[];
    try {
      ns = unref(nodesRef) ?? [];
    } catch {
      viewport.value = { panX: 0, panY: 0, zoom: 1 };
      return;
    }

    if (ns.length === 0) {
      viewport.value = { panX: 0, panY: 0, zoom: 1 };
      return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of ns) {
      if (n.x < minX) minX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.x + n.width > maxX) maxX = n.x + n.width;
      if (n.y + n.height > maxY) maxY = n.y + n.height;
    }

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const zoom = 1;
    viewport.value = {
      panX: containerWidth / 2 - centerX * zoom,
      panY: containerHeight / 2 - centerY * zoom,
      zoom,
    };
  }

  function zoomAtCenter(delta: number, containerWidth: number, containerHeight: number) {
    const newZoom = clamp(viewport.value.zoom * delta, MIN_ZOOM, MAX_ZOOM);
    const cx = containerWidth / 2;
    const cy = containerHeight / 2;
    const scale = newZoom / viewport.value.zoom;
    viewport.value.panX = cx - (cx - viewport.value.panX) * scale;
    viewport.value.panY = cy - (cy - viewport.value.panY) * scale;
    viewport.value.zoom = newZoom;
    applyPanClamp(newZoom, containerWidth, containerHeight);
  }

  function clampPan(containerWidth: number, containerHeight: number) {
    applyPanClamp(viewport.value.zoom, containerWidth, containerHeight);
  }

  return { viewport, screenToCanvas, handleWheel, zoomAtCenter, clampPan, resetView };
}
