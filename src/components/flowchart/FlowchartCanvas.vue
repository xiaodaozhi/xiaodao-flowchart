<template>
  <div
    ref="wrapperRef"
    class="canvas-wrapper"
    :style="{ cursor: cursorStyle }"
    @drop.prevent="onDrop"
    @dragover.prevent
  >
    <svg
      ref="svgRef"
      class="flowchart-svg"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @wheel.prevent="onWheel"
      @contextmenu.prevent
    >
      <defs>
        <pattern
          id="mainGrid"
          :width="gridScreenPx"
          :height="gridScreenPx"
          patternUnits="userSpaceOnUse"
          :x="panOffX"
          :y="panOffY"
        >
          <circle
            cx="0"
            cy="0"
            r="1.5"
            :fill="gridDotStrong"
          />
        </pattern>
        <pattern
          id="sub2"
          :width="gridScreenPx / 2"
          :height="gridScreenPx / 2"
          patternUnits="userSpaceOnUse"
          :x="panOffX"
          :y="panOffY"
        >
          <circle
            cx="0"
            cy="0"
            r="1.0"
            :fill="gridDotWeak"
          />
        </pattern>
        <pattern
          id="sub5"
          :width="gridScreenPx / 5"
          :height="gridScreenPx / 5"
          patternUnits="userSpaceOnUse"
          :x="panOffX"
          :y="panOffY"
        >
          <circle
            cx="0"
            cy="0"
            r="1.0"
            :fill="gridDotWeak"
          />
        </pattern>
        <pattern
          id="sub10"
          :width="gridScreenPx / 10"
          :height="gridScreenPx / 10"
          patternUnits="userSpaceOnUse"
          :x="panOffX"
          :y="panOffY"
        >
          <circle
            cx="0"
            cy="0"
            r="1.0"
            :fill="gridDotWeak"
          />
        </pattern>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <polygon
            points="0 0, 10 3.5, 0 7"
            fill="context-stroke"
          />
        </marker>
      </defs>

      <!-- Screen-space grid background, always fills viewport -->
      <rect
        width="100%"
        height="100%"
        fill="url(#mainGrid)"
      />
      <rect
        v-if="showSub2x"
        width="100%"
        height="100%"
        fill="url(#sub2)"
      />
      <rect
        v-if="showSub5x"
        width="100%"
        height="100%"
        fill="url(#sub5)"
      />
      <rect
        v-if="showSub10x"
        width="100%"
        height="100%"
        fill="url(#sub10)"
      />

      <g :transform="transformStr">
        <g class="edges-layer">
          <FlowchartEdgeCmp
            v-for="edge in validEdges"
            :key="edge.id"
            :edge="edge"
            :source-node="getNode(edge.sourceNodeId)!"
            :target-node="getNode(edge.targetNodeId)!"
            :is-selected="edge.id === selectedEdgeId"
            :all-nodes="edgeRoutingNodes"
            @click="(eid: string) => emit('edgeClick', eid)"
          />
        </g>
        <g
          v-if="drawingState?.active"
          class="drawing-layer"
        >
          <path
            :d="drawingPath"
            fill="none"
            stroke="#4A90D9"
            stroke-width="2"
            stroke-linecap="round"
            stroke-dasharray="6,3"
          />
          <polygon
            v-if="drawingState?.active"
            :points="drawingArrowHead"
            fill="#4A90D9"
          />
        </g>
        <g class="nodes-layer">
          <FlowchartNodeCmp
            v-for="node in nodes"
            :key="node.id"
            :node="node"
            :is-selected="node.id === selectedNodeId"
            :viewport="viewport"
            :show-anchors="shouldShowAnchors(node.id)"
            :is-editing="false"
            :hovered-anchor="hoveredAnchor"
            :hovered-node-id="hoveredNodeId"
          />
        </g>
        <g class="edge-handles-layer">
          <template
            v-for="edge in validEdges"
            :key="edge.id + '-handles'"
          >
            <g v-if="edge.id === selectedEdgeId">
              <circle
                :data-edge-handle="'source'"
                :data-edge-id="edge.id"
                :cx="getEdgeSourcePoint(edge).x"
                :cy="getEdgeSourcePoint(edge).y"
                r="6"
                fill="#4A90D9"
                stroke="#fff"
                stroke-width="2"
                style="cursor: grab;"
              />
              <circle
                :data-edge-handle="'target'"
                :data-edge-id="edge.id"
                :cx="getEdgeTargetPoint(edge).x"
                :cy="getEdgeTargetPoint(edge).y"
                r="6"
                fill="#4A90D9"
                stroke="#fff"
                stroke-width="2"
                style="cursor: grab;"
              />
            </g>
          </template>
        </g>
        <path
          v-if="tempEdgePath"
          :d="tempEdgePath"
          fill="none"
          stroke="#4A90D9"
          stroke-width="2"
          stroke-linecap="round"
          stroke-dasharray="6,3"
        />
      </g>
    </svg>
    <TextNodeEditorCmp
      v-if="editingInfo"
      :key="editingKey"
      :cx="editingInfo.cx"
      :cy="editingInfo.cy"
      :width="editingInfo.width"
      :text="editingInfo.text"
      :font-size="editingInfo.fontSize"
      :color="editingInfo.color"
      :viewport="viewport"
      @commit="(t: string) => emit('labelCommit', t)"
      @cancel="() => emit('labelCancel')"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import './style/theme.css';
import type { FlowchartNode, FlowchartEdge, CanvasViewport, EdgeDrawingState, AnchorPosition, ResizeHandleId, NodeType } from './types/index.ts';
import { getAnchorDisplayPoint, getAnchorPoint } from './utils/anchorUtils';
import { computeOrthogonalWaypoints, buildRoundedPath } from './utils/edgeRouting';
import { snapToGrid } from './utils/geometry';
import { useFlowchartContext } from './composables/useFlowchartContext';
import FlowchartEdgeCmp from './FlowchartEdge.vue';
import FlowchartNodeCmp from './FlowchartNode.vue';
import TextNodeEditorCmp from './TextNodeEditor.vue';

const { theme: currentTheme } = useFlowchartContext();

const BASE = 15;

const props = defineProps<{
  nodes: FlowchartNode[]; edges: FlowchartEdge[]; viewport: CanvasViewport;
  selectedNodeId: string | null; selectedEdgeId: string | null;
  drawingState: EdgeDrawingState | null;
  editingNodeId: string | null;
  editingInfo: { cx: number; cy: number; width: number; text: string; fontSize: number; color: string } | null;
  editingKey: number;
}>();

// --- Grid system ---
// Grid patterns fill screen space (outside transform group).
// pattern width = canvas_grid_spacing * zoom → screen pixels between dots.
// Pan offset aligns dots with canvas coordinate system.

const gridLevel = computed(() => {
  const z = props.viewport.zoom;
  if (z <= 0.1) return 8;
  if (z <= 0.25) return 4;
  if (z <= 0.5) return 2;
  return 1;
});

const gridScreenPx = computed(() => BASE * gridLevel.value * props.viewport.zoom);

const panOffX = computed(() => props.viewport.panX % gridScreenPx.value);
const panOffY = computed(() => props.viewport.panY % gridScreenPx.value);

const showSub2x  = computed(() => props.viewport.zoom >= 2);
const showSub5x  = computed(() => props.viewport.zoom >= 5);
const showSub10x = computed(() => props.viewport.zoom >= 10);

const snapSize = computed(() => {
  const z = props.viewport.zoom;
  if (z >= 10) return BASE / 10;
  if (z >= 5)  return BASE / 5;
  if (z >= 2)  return BASE / 2;
  return BASE * gridLevel.value;
});

// Grid dot colors — computed from theme since SVG patterns can't use CSS var()
const gridDotStrong = computed(() => currentTheme === 'dark' ? '#555' : '#B0B0B0');
const gridDotWeak = computed(() => currentTheme === 'dark' ? '#444' : '#D0D0D0');

// --- everything below is unchanged from the original ---

type DragState
  = | { type: 'none' }
    | { type: 'clickPending'; nodeId: string; startPX: number; startPY: number }
    | { type: 'node'; nodeId: string; startNX: number; startNY: number; startPX: number; startPY: number }
    | { type: 'resize'; nodeId: string; handle: ResizeHandleId; pnx: number; pny: number; nx: number; ny: number; nw: number; nh: number }
    | { type: 'drawing'; sourceNodeId: string; sourceAnchor: AnchorPosition }
    | { type: 'pan'; startPX: number; startPY: number; startPanX: number; startPanY: number }
    | { type: 'edgeHandle'; edgeId: string; handle: 'source' | 'target'; startPX: number; startPY: number };

const emit = defineEmits<{
  canvasClick: []; nodeClick: [nodeId: string]; nodeDblClick: [nodeId: string];
  edgeClick: [edgeId: string];
  panMove: [panX: number, panY: number];
  nodeDragMove: [nodeId: string, x: number, y: number];
  nodeResize: [nodeId: string, x: number, y: number, w: number, h: number];
  anchorMouseDown: [nodeId: string, anchor: AnchorPosition];
  anchorMouseUp: [nodeId: string, anchor: AnchorPosition];
  drawingUpdate: [canvasX: number, canvasY: number]; drawingCancel: [];
  canvasDrop: [nodeType: NodeType, canvasX: number, canvasY: number, snapSize: number];
  canvasWheel: [event: WheelEvent, containerRect: DOMRect];
  labelCommit: [label: string]; labelCancel: [];
  edgeReroute: [edgeId: string, handle: 'source' | 'target', targetNodeId: string, targetAnchor: AnchorPosition];
}>();

const svgRef = ref<SVGSVGElement | null>(null);
const wrapperRef = ref<HTMLElement | null>(null);
const hoveredNodeId = ref<string | null>(null);
const hoveredAnchor = ref<AnchorPosition | null>(null);
const tempEdgePath = ref<string>('');
const isDraggingEdgeHandle = ref(false);
const edgeHandleDragEdgeId = ref<string | null>(null);

const cursorStyle = computed(() => {
  if (drag.type === 'pan') return 'grabbing';
  if (drag.type === 'node' || drag.type === 'clickPending') return 'move';
  if (drag.type === 'resize') return 'default';
  return 'default';
});

const transformStr = computed(() => `translate(${props.viewport.panX}, ${props.viewport.panY}) scale(${props.viewport.zoom})`);
const validEdges = computed(() => props.edges.filter((e) => getNode(e.sourceNodeId) && getNode(e.targetNodeId)));

const edgeRoutingNodes = computed(() =>
  props.nodes.map((n) => ({ id: n.id, type: n.type, x: n.x, y: n.y, width: n.width, height: n.height })),
);

function getNode(id: string): FlowchartNode | undefined {
  return props.nodes.find((n) => n.id === id);
}
function getEdgeSourcePoint(edge: FlowchartEdge) {
  const n = getNode(edge.sourceNodeId);
  return n ? getAnchorPoint(n, edge.sourceAnchor) : { x: 0, y: 0 };
}
function getEdgeTargetPoint(edge: FlowchartEdge) {
  const n = getNode(edge.targetNodeId);
  return n ? getAnchorPoint(n, edge.targetAnchor) : { x: 0, y: 0 };
}
function shouldShowAnchors(nodeId: string): boolean {
  if (nodeId === props.selectedNodeId) return true;
  if (props.drawingState?.active && nodeId !== props.drawingState.sourceNodeId) return true;
  if (isDraggingEdgeHandle.value) return true;
  return false;
}

const drawingPath = computed(() => {
  const ds = props.drawingState;
  if (!ds?.active) return '';
  const n = getNode(ds.sourceNodeId);
  if (!n) return '';
  const src = getAnchorPoint(n, ds.sourceAnchor);
  const ta: AnchorPosition = ds.sourceAnchor === 'top' ? 'bottom' : ds.sourceAnchor === 'bottom' ? 'top' : ds.sourceAnchor === 'left' ? 'right' : 'left';
  return buildRoundedPath(computeOrthogonalWaypoints(src, ds.sourceAnchor, { x: ds.currentMouseX, y: ds.currentMouseY }, ta), 0);
});

const drawingArrowHead = computed(() => {
  const ds = props.drawingState;
  if (!ds?.active) return '';
  const n = getNode(ds.sourceNodeId);
  if (!n) return '';
  const src = getAnchorPoint(n, ds.sourceAnchor);
  const tx = ds.currentMouseX;
  const ty = ds.currentMouseY;
  const angle = Math.atan2(ty - src.y, tx - src.x);
  const ax1 = tx - 10 * Math.cos(angle - 0.4);
  const ay1 = ty - 10 * Math.sin(angle - 0.4);
  const ax2 = tx - 10 * Math.cos(angle + 0.4);
  const ay2 = ty - 10 * Math.sin(angle + 0.4);
  return `${tx},${ty} ${ax1},${ay1} ${ax2},${ay2}`;
});

let drag: DragState = { type: 'none' };
const MIN_DRAG = 3;
let lastClickNodeId: string | null = null;
let lastClickTime = 0;
const DBL = 400;

function sc(sx: number, sy: number) {
  const r = wrapperRef.value?.getBoundingClientRect();
  if (!r) return { x: 0, y: 0 };
  return { x: (sx - r.left - props.viewport.panX) / props.viewport.zoom, y: (sy - r.top - props.viewport.panY) / props.viewport.zoom };
}

function findAnchorNearPoint(nodeId: string, px: number, py: number): AnchorPosition | null {
  const n = getNode(nodeId); if (!n) return null;
  for (const a of ['top', 'right', 'bottom', 'left'] as AnchorPosition[]) {
    const p = getAnchorDisplayPoint(n, a);
    if (Math.hypot(px - p.x, py - p.y) < 20) return a;
  }
  return null;
}

function onPointerDown(event: PointerEvent) {
  if (event.button === 1) {
    drag = { type: 'pan', startPX: event.clientX, startPY: event.clientY, startPanX: props.viewport.panX, startPanY: props.viewport.panY };
    svgRef.value!.setPointerCapture(event.pointerId);
    event.preventDefault(); return;
  }
  if (event.button !== 0) return;
  const t = event.target as Element;
  const pc = sc(event.clientX, event.clientY);

  if (props.drawingState?.active) {
    for (const n of props.nodes) {
      if (n.id === props.drawingState.sourceNodeId) continue;
      const a = findAnchorNearPoint(n.id, pc.x, pc.y);
      if (a) { emit('anchorMouseUp', n.id, a); drag = { type: 'none' }; hoveredNodeId.value = null; hoveredAnchor.value = null; return; }
    }
    emit('drawingCancel'); drag = { type: 'none' }; hoveredNodeId.value = null; hoveredAnchor.value = null; return;
  }

  // Edge drag handle (source/target endpoint)
  const eh = t.closest('[data-edge-handle]');
  if (eh) {
    const eid = eh.getAttribute('data-edge-id')!;
    const hnd = eh.getAttribute('data-edge-handle')! as 'source' | 'target';
    drag = { type: 'edgeHandle', edgeId: eid, handle: hnd, startPX: event.clientX, startPY: event.clientY };
    isDraggingEdgeHandle.value = true;
    edgeHandleDragEdgeId.value = eid;
    svgRef.value!.setPointerCapture(event.pointerId);
    event.preventDefault(); return;
  }

  const eg = t.closest('[data-edge-id]');
  if (eg) {
    const eid = eg.getAttribute('data-edge-id')!;
    emit('edgeClick', eid);
    event.preventDefault(); return;
  }

  const hel = t.closest('[data-handle-id]');
  if (hel) {
    const hid = hel.getAttribute('data-handle-id')! as ResizeHandleId;
    const nid = t.closest('[data-node-id]')!.getAttribute('data-node-id')!;
    const n = getNode(nid)!;
    drag = { type: 'resize', nodeId: nid, handle: hid, pnx: pc.x, pny: pc.y, nx: n.x, ny: n.y, nw: n.width, nh: n.height };
    svgRef.value!.setPointerCapture(event.pointerId);
    event.preventDefault(); return;
  }

  const ael = t.closest('[data-anchor]');
  if (ael) {
    const an = ael.getAttribute('data-anchor')! as AnchorPosition;
    const nid = t.closest('[data-node-id]')!.getAttribute('data-node-id')!;
    emit('anchorMouseDown', nid, an);
    drag = { type: 'drawing', sourceNodeId: nid, sourceAnchor: an };
    svgRef.value!.setPointerCapture(event.pointerId);
    event.preventDefault(); return;
  }

  const ng = t.closest('[data-node-id]');
  if (ng) {
    const nid = ng.getAttribute('data-node-id')!;
    const now = Date.now();
    if (lastClickNodeId === nid && now - lastClickTime < DBL) {
      emit('nodeDblClick', nid); lastClickNodeId = null; lastClickTime = 0; event.preventDefault(); return;
    }
    lastClickNodeId = nid; lastClickTime = now;
    emit('nodeClick', nid);
    drag = { type: 'clickPending', nodeId: nid, startPX: event.clientX, startPY: event.clientY };
    event.preventDefault(); return;
  }

  lastClickNodeId = null;
  emit('canvasClick');
  drag = { type: 'pan', startPX: event.clientX, startPY: event.clientY, startPanX: props.viewport.panX, startPanY: props.viewport.panY };
  svgRef.value!.setPointerCapture(event.pointerId);
  event.preventDefault();
}

function onPointerMove(event: PointerEvent) {
  const pc = sc(event.clientX, event.clientY);

  if (drag.type === 'pan') {
    emit('panMove', event.clientX - drag.startPX + drag.startPanX, event.clientY - drag.startPY + drag.startPanY);
    return;
  }

  if (drag.type === 'edgeHandle') {
    const edgeId = drag.edgeId;
    const handle = drag.handle;
    let bn: string | null = null, ba: AnchorPosition | null = null, bd = Infinity;
    for (const n of props.nodes) {
      if (props.edges.find((e) => e.id === edgeId) && (n.id === props.edges.find((e) => e.id === edgeId)!.sourceNodeId || n.id === props.edges.find((e) => e.id === edgeId)!.targetNodeId)) {
        // Check if the other endpoint is anchored to this node; don't restrict further
      }
      for (const a of ['top', 'right', 'bottom', 'left'] as AnchorPosition[]) {
        const p = getAnchorDisplayPoint(n, a); const d = Math.hypot(pc.x - p.x, pc.y - p.y);
        if (d < 25 && d < bd) { bd = d; bn = n.id; ba = a; }
      }
    }
    hoveredNodeId.value = bn; hoveredAnchor.value = ba;
    // Draw temp edge path: always show dashed line following mouse
    const edge = props.edges.find((e) => e.id === edgeId);
    if (edge) {
      const fixedNode = getNode(handle === 'source' ? edge.targetNodeId : edge.sourceNodeId);
      const fixedAnchor = handle === 'source' ? edge.targetAnchor : edge.sourceAnchor;
      if (fixedNode) {
        const s = getAnchorPoint(fixedNode, fixedAnchor);
        const tgtAnchor: AnchorPosition = bn && ba ? ba : (fixedAnchor === 'top' ? 'bottom' : fixedAnchor === 'bottom' ? 'top' : fixedAnchor === 'left' ? 'right' : 'left');
        const t = bn && ba ? getAnchorPoint(getNode(bn)!, ba) : pc;
        tempEdgePath.value = buildRoundedPath(computeOrthogonalWaypoints(s, fixedAnchor, t, tgtAnchor), 0);
      }
    }
    return;
  }

  if (drag.type === 'clickPending') {
    if (Math.abs(event.clientX - drag.startPX) < MIN_DRAG && Math.abs(event.clientY - drag.startPY) < MIN_DRAG) return;
    const n = getNode(drag.nodeId)!;
    drag = { type: 'node', nodeId: drag.nodeId, startNX: n.x, startNY: n.y, startPX: drag.startPX, startPY: drag.startPY };
    svgRef.value!.setPointerCapture(event.pointerId);
  }

  if (props.drawingState?.active || drag.type === 'drawing') {
    emit('drawingUpdate', pc.x, pc.y);
    const sid = props.drawingState?.sourceNodeId ?? (drag.type === 'drawing' ? drag.sourceNodeId : null);
    let bn: string | null = null, ba: AnchorPosition | null = null, bd = Infinity;
    for (const n of props.nodes) {
      if (n.id === sid) continue;
      for (const a of ['top', 'right', 'bottom', 'left'] as AnchorPosition[]) {
        const p = getAnchorDisplayPoint(n, a); const d = Math.hypot(pc.x - p.x, pc.y - p.y);
        if (d < 25 && d < bd) { bd = d; bn = n.id; ba = a; }
      }
    }
    hoveredNodeId.value = bn; hoveredAnchor.value = ba; return;
  }

  if (drag.type === 'none') return;

  if (drag.type === 'node') {
    const dx = (event.clientX - drag.startPX) / props.viewport.zoom;
    const dy = (event.clientY - drag.startPY) / props.viewport.zoom;
    emit('nodeDragMove', drag.nodeId, snapToGrid(drag.startNX + dx, snapSize.value), snapToGrid(drag.startNY + dy, snapSize.value));
    return;
  }

  if (drag.type === 'resize') {
    const dx = pc.x - drag.pnx, dy = pc.y - drag.pny;
    let nx = drag.nx, ny = drag.ny, nw = drag.nw, nh = drag.nh;
    const MIN = 40, MINH = 30;
    switch (drag.handle) {
      case 'top-left':     nx = drag.nx + dx; ny = drag.ny + dy; nw = drag.nw - dx; nh = drag.nh - dy; break;
      case 'top-center':   ny = drag.ny + dy; nh = drag.nh - dy; break;
      case 'top-right':    ny = drag.ny + dy; nw = drag.nw + dx; nh = drag.nh - dy; break;
      case 'middle-left':  nx = drag.nx + dx; nw = drag.nw - dx; break;
      case 'middle-right': nw = drag.nw + dx; break;
      case 'bottom-left':  nx = drag.nx + dx; nw = drag.nw - dx; nh = drag.nh + dy; break;
      case 'bottom-center':nh = drag.nh + dy; break;
      case 'bottom-right': nw = drag.nw + dx; nh = drag.nh + dy; break;
    }
    if (nw < MIN) { if (drag.handle.includes('left')) nx = drag.nx + drag.nw - MIN; nw = MIN; }
    if (nh < MINH) { if (drag.handle.includes('top')) ny = drag.ny + drag.nh - MINH; nh = MINH; }

    if (drag.handle === 'top-left' || drag.handle === 'top-right' || drag.handle === 'bottom-left' || drag.handle === 'bottom-right') {
      nx = snapToGrid(nx, snapSize.value); ny = snapToGrid(ny, snapSize.value);
      nw = snapToGrid(nw, snapSize.value); nh = snapToGrid(nh, snapSize.value);
    } else if (drag.handle === 'top-center' || drag.handle === 'bottom-center') {
      ny = snapToGrid(ny, snapSize.value); nh = snapToGrid(nh, snapSize.value);
    } else {
      nx = snapToGrid(nx, snapSize.value); nw = snapToGrid(nw, snapSize.value);
    }

    if (nw < MIN) nw = MIN;
    if (nh < MINH) nh = MINH;
    emit('nodeResize', drag.nodeId, nx, ny, nw, nh);
  }
}

function onPointerUp(event: PointerEvent) {
  if (drag.type === 'none') return;

  if (drag.type === 'edgeHandle') {
    if (hoveredNodeId.value && hoveredAnchor.value) {
      emit('edgeReroute', drag.edgeId, drag.handle, hoveredNodeId.value, hoveredAnchor.value);
    }
    tempEdgePath.value = '';
    hoveredNodeId.value = null;
    hoveredAnchor.value = null;
    isDraggingEdgeHandle.value = false;
    edgeHandleDragEdgeId.value = null;
    drag = { type: 'none' };
    svgRef.value?.releasePointerCapture(event.pointerId);
    return;
  }

  if (drag.type === 'pan' || drag.type === 'clickPending') { drag = { type: 'none' }; svgRef.value?.releasePointerCapture(event.pointerId); return; }

  if (drag.type === 'drawing') {
    const pc = sc(event.clientX, event.clientY);
    for (const n of props.nodes) {
      if (n.id === drag.sourceNodeId) continue;
      const a = findAnchorNearPoint(n.id, pc.x, pc.y);
      if (a) { emit('anchorMouseUp', n.id, a); drag = { type: 'none' }; hoveredNodeId.value = null; hoveredAnchor.value = null; svgRef.value?.releasePointerCapture(event.pointerId); return; }
    }
    emit('drawingCancel'); drag = { type: 'none' }; hoveredNodeId.value = null; hoveredAnchor.value = null; svgRef.value?.releasePointerCapture(event.pointerId); return;
  }

  drag = { type: 'none' };
  svgRef.value?.releasePointerCapture(event.pointerId);
}

function onWheel(event: WheelEvent) { const r = wrapperRef.value?.getBoundingClientRect(); if (r) emit('canvasWheel', event, r); }
function onDrop(event: DragEvent) {
  const nt = event.dataTransfer?.getData('application/x-flowchart-node-type') as NodeType | undefined;
  if (!nt) return;
  const c = sc(event.clientX, event.clientY);
  emit('canvasDrop', nt, snapToGrid(c.x, snapSize.value), snapToGrid(c.y, snapSize.value), snapSize.value);
}
</script>

<style scoped>
.canvas-wrapper { flex: 1; overflow: hidden; position: relative; background: var(--fc-canvas-bg); }
.flowchart-svg { width: 100%; height: 100%; display: block; }
</style>
