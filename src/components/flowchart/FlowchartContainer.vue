<template>
  <div
    class="flowchart-container"
    :class="{ 'theme-dark': resolvedTheme === 'dark' }"
    :style="{ width: resolvedWidth, height: resolvedHeight }"
    tabindex="0"
    @drop.prevent
    @dragover.prevent
  >
    <NodeSidebar
      :templates="templates"
      :line-tool-active="lineToolActive"
      @toggle-line-tool="toggleLineTool"
      @node-pointer-drag-start="onSidebarNodePointerDragStart"
      @node-pointer-drag-move="onSidebarNodePointerDragMove"
      @node-pointer-drag-end="onSidebarNodePointerDragEnd"
      @node-pointer-drag-cancel="onSidebarNodePointerDragCancel"
      @line-pointer-drag-start="onSidebarLinePointerDragStart"
      @line-pointer-drag-move="onSidebarLinePointerDragMove"
      @line-pointer-drag-end="onSidebarLinePointerDragEnd"
      @line-pointer-drag-cancel="onSidebarLinePointerDragCancel"
    />
    <div
      v-if="sidebarDragGhost"
      class="sidebar-drag-ghost"
      :style="sidebarDragGhostStyle"
    >
      <svg
        :width="32"
        :height="24"
        class="sidebar-drag-ghost-icon"
      >
        <rect
          v-if="sidebarDragGhost.kind === 'node' && sidebarDragGhost.nodeType === 'rectangle'"
          x="2"
          y="2"
          width="28"
          height="20"
          rx="3"
          fill="var(--fc-sidebar-icon-fill)"
          stroke="var(--fc-sidebar-icon-stroke)"
          stroke-width="1.5"
        />
        <polygon
          v-if="sidebarDragGhost.kind === 'node' && sidebarDragGhost.nodeType === 'diamond'"
          :points="`16,1 30,12 16,23 2,12`"
          fill="var(--fc-sidebar-icon-fill)"
          stroke="var(--fc-sidebar-icon-stroke)"
          stroke-width="1.5"
        />
        <ellipse
          v-if="sidebarDragGhost.kind === 'node' && sidebarDragGhost.nodeType === 'ellipse'"
          cx="16"
          cy="12"
          rx="14"
          ry="10"
          fill="var(--fc-sidebar-icon-fill)"
          stroke="var(--fc-sidebar-icon-stroke)"
          stroke-width="1.5"
        />
        <polygon
          v-if="sidebarDragGhost.kind === 'node' && sidebarDragGhost.nodeType === 'parallelogram'"
          points="6,2 30,2 26,22 2,22"
          fill="var(--fc-sidebar-icon-fill)"
          stroke="var(--fc-sidebar-icon-stroke)"
          stroke-width="1.5"
        />
        <g v-if="sidebarDragGhost.kind === 'node' && sidebarDragGhost.nodeType === 'text'">
          <rect
            x="2"
            y="3"
            width="28"
            height="18"
            rx="2"
            fill="var(--fc-sidebar-icon-fill)"
            stroke="var(--fc-sidebar-icon-stroke)"
            stroke-width="1.5"
            stroke-dasharray="3,2"
          />
          <text
            x="16"
            y="16"
            text-anchor="middle"
            font-size="12"
            fill="var(--fc-sidebar-icon-stroke)"
            font-weight="bold"
            font-family="serif"
          >T</text>
        </g>
        <g v-if="sidebarDragGhost.kind === 'line'">
          <line
            x1="4"
            y1="20"
            x2="28"
            y2="4"
            stroke="var(--fc-sidebar-icon-stroke)"
            stroke-width="2"
            stroke-linecap="round"
          />
          <circle
            cx="4"
            cy="20"
            r="2"
            fill="var(--fc-sidebar-icon-stroke)"
          />
          <circle
            cx="28"
            cy="4"
            r="2"
            fill="var(--fc-sidebar-icon-stroke)"
          />
        </g>
      </svg>
      <span
        v-if="!resolvedMobile"
        class="sidebar-drag-ghost-label"
      >{{ sidebarDragGhost.label }}</span>
    </div>
    <div
      ref="canvasAreaRef"
      class="canvas-area"
    >
      <FlowchartCanvas
        :nodes="internalData.nodes"
        :edges="internalData.edges"
        :free-lines="internalData.freeLines ?? []"
        :viewport="viewport"
        :selected-node-id="selectedNodeId"
        :selected-edge-id="selectedEdgeId"
        :selected-free-line-id="selectedFreeLineId"
        :line-tool-active="lineToolActive"
        :drawing-state="drawingState"
        :editing-node-id="editingNodeId"
        :editing-info="editingInfo"
        :editing-key="editingKey"
        @canvas-click="onCanvasClick"
        @node-click="onNodeClick"
        @node-dbl-click="onNodeDblClick"
        @edge-click="onEdgeClick"
        @free-line-click="onFreeLineClick"
        @free-line-draw="onFreeLineDraw"
        @free-line-move="onFreeLineMove"
        @node-drag-move="(nid, x, y) => model.setNodePosition(nid, x, y)"
        @node-resize="(nid, x, y, w, h) => model.resizeNode(nid, x, y, w, h)"
        @anchor-mouse-down="onAnchorMouseDown"
        @anchor-mouse-up="onAnchorMouseUp"
        @drawing-cancel="onDrawingCancel"
        @drawing-update="onDrawingUpdate"
        @canvas-drop="onCanvasDrop"
        @canvas-wheel="onCanvasWheel"
        @pan-move="onPanMove"
        @label-commit="onLabelCommit"
        @label-cancel="cancelEditing"
        @edge-remove="onEdgeRemove"
        @edge-reroute="onEdgeReroute"
      />
      <div class="canvas-toolbar">
        <button
          class="canvas-tb-btn"
          :disabled="!canUndo"
          :title="i18n.t('toolbar.undo')"
          @click="undo"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          ><path d="M3 10h10a5 5 0 0 1 0 10H9" /><polyline points="7 6 3 10 7 14" /></svg>
        </button>
        <button
          class="canvas-tb-btn"
          :disabled="!canRedo"
          :title="i18n.t('toolbar.redo')"
          @click="redo"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          ><path d="M21 10H11a5 5 0 0 0 0 10h4" /><polyline points="17 6 21 10 17 14" /></svg>
        </button>
        <button
          class="canvas-tb-btn"
          :title="i18n.t('toolbar.zoomIn')"
          @click="zoomIn"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          ><circle
            cx="11"
            cy="11"
            r="8"
          /><line
            x1="21"
            y1="21"
            x2="16.65"
            y2="16.65"
          /><line
            x1="11"
            y1="8"
            x2="11"
            y2="14"
          /><line
            x1="8"
            y1="11"
            x2="14"
            y2="11"
          /></svg>
        </button>
        <button
          class="canvas-tb-btn"
          :title="i18n.t('toolbar.zoomOut')"
          @click="zoomOut"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          ><circle
            cx="11"
            cy="11"
            r="8"
          /><line
            x1="21"
            y1="21"
            x2="16.65"
            y2="16.65"
          /><line
            x1="8"
            y1="11"
            x2="14"
            y2="11"
          /></svg>
        </button>
        <button
          class="canvas-tb-btn"
          :title="i18n.t('toolbar.resetView')"
          @click="resetCanvasView"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          ><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" /></svg>
        </button>
        <button
          v-if="selectedNodeId !== null || selectedEdgeId !== null || selectedFreeLineId !== null"
          class="canvas-tb-btn canvas-tb-delete"
          :title="deleteButtonTitle"
          @click="handleDelete()"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </button>
      </div>
      <NodeActionBar
        :visible="selectedNodeId !== null"
        :current-color="selectedNodeColor"
        @pick-color="onPickNodeColor"
      />
      <EdgeActionBar
        :visible="selectedEdgeId !== null || selectedFreeLineId !== null"
        :current-color="selectedEdgeOrLineColor"
        @pick-color="onPickEdgeOrLineColor"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, toRef, type Ref, provide, watch, onMounted, onUnmounted, nextTick } from 'vue';
import type { FlowchartData, AnchorPosition, NodeType, Theme, Locale } from './types/index.ts';
import { GRID_SIZE } from './types/index';
import { useFlowchartModel } from './composables/useFlowchartModel';
import { useSelection } from './composables/useSelection';
import { useDragFromSidebar } from './composables/useDragFromSidebar';
import { useEdgeDrawing } from './composables/useEdgeDrawing';
import { useCanvasPanZoom } from './composables/useCanvasPanZoom';
import { useKeyboard } from './composables/useKeyboard';
import { themeKey, localeKey, mobileKey } from './composables/useFlowchartContext';
import { createI18n } from './composables/useFlowchartI18n';
import { getAnchorDisplayPoint } from './utils/anchorUtils';
import { snapToGrid } from './utils/geometry';
import { DEFAULT_COLOR, EDGE_DEFAULT_COLOR } from './utils/colorUtils';
import { generateId } from './utils/idGenerator';
import NodeSidebar from './NodeSidebar.vue';
import FlowchartCanvas from './FlowchartCanvas.vue';
import NodeActionBar from './NodeActionBar.vue';
import EdgeActionBar from './EdgeActionBar.vue';

const props = defineProps<{
  modelValue: FlowchartData;
  theme?: Theme;
  locale?: Locale;
  mobile?: boolean;
  width?: string | number;
  height?: string | number;
}>();

const resolvedTheme = computed(() => props.theme ?? 'light');
const resolvedLocale = computed(() => props.locale ?? 'zh-CN');
const resolvedMobile = computed(() => props.mobile ?? false);
const resolvedWidth = computed(() => {
  const w = props.width;
  if (w === undefined || w === null) return undefined;
  return typeof w === 'number' ? `${w}px` : w;
});
const resolvedHeight = computed(() => {
  const h = props.height;
  if (h === undefined || h === null) return undefined;
  return typeof h === 'number' ? `${h}px` : h;
});

provide(themeKey, resolvedTheme);
provide(localeKey, resolvedLocale);
provide(mobileKey, resolvedMobile);

const emit = defineEmits<{
  'update:modelValue': [value: FlowchartData];
  nodeSelect: [nodeId: string | null];
  nodeDblClick: [nodeId: string];
  edgeSelect: [edgeId: string | null];
}>();

const modelValueRef = toRef(props, 'modelValue') as Ref<FlowchartData>;
const model = useFlowchartModel(modelValueRef, (_event: string, value: FlowchartData) => {
  emit('update:modelValue', value);
});
const { internalData } = model;

const selection = useSelection();
const { selectedNodeId, selectedEdgeId, selectedFreeLineId } = selection;

const sidebar = useDragFromSidebar(model.addNode, computed(() => createI18n(resolvedLocale.value)));
const { templates } = sidebar;

const i18n = computed(() => createI18n(resolvedLocale.value));
const deleteButtonTitle = computed(() => {
  if (selectedNodeId.value) return i18n.value.t('node.delete');
  if (selectedEdgeId.value) return i18n.value.t('edge.delete');
  return i18n.value.t('toolbar.delete');
});
const lineToolActive = ref(false);
const canvasAreaRef = ref<HTMLElement | null>(null);
const sidebarNodeDrag = ref<{ nodeType: NodeType; clientX: number; clientY: number } | null>(null);
const sidebarLineDrag = ref<{ clientX: number; clientY: number } | null>(null);

const sidebarDragGhost = computed(() => {
  const nodeDrag = sidebarNodeDrag.value;
  if (nodeDrag) {
    return {
      kind: 'node' as const,
      nodeType: nodeDrag.nodeType,
      label: templates.value.find((template) => template.type === nodeDrag.nodeType)?.label ?? '',
      clientX: nodeDrag.clientX,
      clientY: nodeDrag.clientY,
    };
  }

  const lineDrag = sidebarLineDrag.value;
  if (lineDrag) {
    return {
      kind: 'line' as const,
      label: i18n.value.t('sidebar.freeLine'),
      clientX: lineDrag.clientX,
      clientY: lineDrag.clientY,
    };
  }

  return null;
});

const sidebarDragGhostStyle = computed(() => {
  const ghost = sidebarDragGhost.value;
  if (!ghost) return {};
  return {
    left: `${ghost.clientX}px`,
    top: `${ghost.clientY}px`,
  };
});

function toggleLineTool() {
  lineToolActive.value = !lineToolActive.value;
}

const panZoom = useCanvasPanZoom(computed(() => internalData.value.nodes));
const { viewport, handleWheel, zoomAtCenter, resetView } = panZoom;

// ─── Undo / Redo history ──────────────────────────────────────────────────
const MAX_HISTORY = 50;
const history = ref<FlowchartData[]>([]);
const historyIndex = ref(-1);
const canUndo = computed(() => historyIndex.value > 0);
const canRedo = computed(() => historyIndex.value < history.value.length - 1);

function pushHistory(data: FlowchartData) {
  const clone = JSON.parse(JSON.stringify(data)) as FlowchartData;
  // Discard redo entries ahead of the current index
  if (historyIndex.value < history.value.length - 1) {
    history.value = history.value.slice(0, historyIndex.value + 1);
  }
  history.value.push(clone);
  if (history.value.length > MAX_HISTORY) {
    history.value.shift();
  } else {
    historyIndex.value++;
  }
}

let suppressHistory = false;

function undo() {
  if (!canUndo.value) return;
  suppressHistory = true;
  historyIndex.value--;
  emit('update:modelValue', JSON.parse(JSON.stringify(history.value[historyIndex.value])));
}

function redo() {
  if (!canRedo.value) return;
  suppressHistory = true;
  historyIndex.value++;
  emit('update:modelValue', JSON.parse(JSON.stringify(history.value[historyIndex.value])));
}

const ZOOM_STEP = 1.08;

function zoomIn() {
  const el = canvasAreaRef.value;
  if (el) zoomAtCenter(ZOOM_STEP, el.clientWidth, el.clientHeight);
}

function zoomOut() {
  const el = canvasAreaRef.value;
  if (el) zoomAtCenter(1 / ZOOM_STEP, el.clientWidth, el.clientHeight);
}

function resetCanvasView() {
  const el = canvasAreaRef.value;
  if (el) resetView(el.clientWidth, el.clientHeight);
  else resetView(0, 0);
}

watch(modelValueRef, (newVal) => {
  if (suppressHistory) {
    suppressHistory = false;
    return;
  }
  if (JSON.stringify(newVal) !== JSON.stringify(history.value[historyIndex.value] ?? null)) {
    pushHistory(newVal);
  }
}, { immediate: true, deep: true });

function onEdgeReroute(edgeId: string, handle: 'source' | 'target', targetNodeId: string, targetAnchor: AnchorPosition) {
  const newData = JSON.parse(JSON.stringify(internalData.value));
  const edge = newData.edges.find((e: typeof newData.edges[number]) => e.id === edgeId);
  if (edge) {
    const otherNodeId = handle === 'source' ? edge.targetNodeId : edge.sourceNodeId;
    if (targetNodeId === otherNodeId) return;
    if (handle === 'source') {
      edge.sourceNodeId = targetNodeId;
      edge.sourceAnchor = targetAnchor;
    } else {
      edge.targetNodeId = targetNodeId;
      edge.targetAnchor = targetAnchor;
    }
    emit('update:modelValue', newData);
  }
}

const edgeDrawing = useEdgeDrawing(model.addEdge);
const { drawingState, startDrawing, updateDrawing, finishDrawing, cancelDrawing, isDrawing } = edgeDrawing;

const editingNodeId = ref<string | null>(null);
const editingKey = ref(0);

const editingInfo = computed(() => {
  const id = editingNodeId.value;
  if (!id) return null;
  const n = model.getNode(id);
  if (!n) return null;
  return {
    cx: n.x + n.width / 2,
    cy: n.y + n.height / 2,
    width: n.width,
    text: n.label,
    fontSize: n.style?.fontSize ?? 14,
  };
});

useKeyboard({
  Delete: handleDelete,
  Backspace: handleDelete,
  Escape: () => {
    cancelDrawing();
    selection.clearSelection();
    cancelEditing();
  },
  ArrowUp: (e: KeyboardEvent) => nudgeNode(e, 0, -1),
  ArrowDown: (e: KeyboardEvent) => nudgeNode(e, 0, 1),
  ArrowLeft: (e: KeyboardEvent) => nudgeNode(e, -1, 0),
  ArrowRight: (e: KeyboardEvent) => nudgeNode(e, 1, 0),
});

onMounted(() => {
  window.addEventListener('keydown', onUndoRedoKeydown);
  window.addEventListener('paste', onExternalPaste);
  nextTick(() => {
    const el = canvasAreaRef.value;
    if (el) resetView(el.clientWidth, el.clientHeight);
  });
});
onUnmounted(() => {
  window.removeEventListener('keydown', onUndoRedoKeydown);
  window.removeEventListener('paste', onExternalPaste);
});

function onUndoRedoKeydown(e: KeyboardEvent) {
  const mod = e.metaKey || e.ctrlKey;
  if (!mod) return;
  if (e.key === 'z' || e.key === 'Z') {
    if (e.shiftKey) {
      e.preventDefault();
      redo();
    } else {
      e.preventDefault();
      undo();
    }
  } else if (e.key === 'y' || e.key === 'Y') {
    e.preventDefault();
    redo();
  } else if (e.key === 'x' || e.key === 'X') {
    e.preventDefault();
    cutSelection();
  } else if (e.key === 'c' || e.key === 'C') {
    e.preventDefault();
    copySelection();
  }
  // Ctrl+V is handled in the paste event listener below
}

const internalClipboard = ref<FlowchartData | null>(null);

function copySelection() {
  if (editingNodeId.value) return;
  const nid = selection.selectedNodeId.value;
  const eid = selection.selectedEdgeId.value;
  const fid = selection.selectedFreeLineId.value;
  if (!nid && !eid && !fid) return;

  if (nid) {
    const node = model.getNode(nid);
    if (node) {
      internalClipboard.value = { nodes: [JSON.parse(JSON.stringify(node))], edges: [] };
    }
  } else if (eid) {
    const edge = model.getEdge(eid);
    if (edge) {
      internalClipboard.value = { nodes: [], edges: [JSON.parse(JSON.stringify(edge))] };
    }
  } else if (fid) {
    const fl = model.getFreeLine(fid);
    if (fl) {
      internalClipboard.value = { nodes: [], edges: [], freeLines: [JSON.parse(JSON.stringify(fl))] };
    }
  }
}

function cutSelection() {
  copySelection();
  handleDelete();
}

const PASTE_OFFSET = 30;
let pasteCounter = 0;

function pasteClipboard() {
  if (!internalClipboard.value) return;
  pasteCounter++;
  const offset = PASTE_OFFSET * pasteCounter;
  const clip = internalClipboard.value;
  const newIds = new Map<string, string>();

  const newNodes = (clip.nodes ?? []).map((n) => {
    const nid = generateId();
    newIds.set(n.id, nid);
    return { ...n, id: nid, x: n.x + offset, y: n.y + offset };
  });
  const newEdges = (clip.edges ?? []).map((e) => ({
    ...e,
    id: generateId(),
    sourceNodeId: newIds.get(e.sourceNodeId) ?? e.sourceNodeId,
    targetNodeId: newIds.get(e.targetNodeId) ?? e.targetNodeId,
  }));
  const newLines = (clip.freeLines ?? []).map((fl) => ({
    ...fl,
    id: generateId(),
    x1: fl.x1 + offset,
    y1: fl.y1 + offset,
    x2: fl.x2 + offset,
    y2: fl.y2 + offset,
  }));

  const cur = JSON.parse(JSON.stringify(internalData.value)) as FlowchartData;
  cur.nodes.push(...newNodes);
  cur.edges.push(...newEdges);
  cur.freeLines = [...(cur.freeLines ?? []), ...newLines];
  emit('update:modelValue', cur);
}

function onExternalPaste(e: ClipboardEvent) {
  // If we have internal clipboard content, use that (handles Ctrl+V paste of flowchart items)
  if (internalClipboard.value) {
    e.preventDefault();
    pasteClipboard();
    return;
  }
  // Otherwise, try to paste system clipboard text as a "text" node
  if (editingNodeId.value) return;
  const text = e.clipboardData?.getData('text/plain')?.trim();
  if (!text || text.length === 0) return;
  e.preventDefault();
  const label = text.length > 100 ? text.slice(0, 100) : text;
  // Place the text node at the center of the current viewport
  const container = document.querySelector('.flowchart-container');
  if (!container) return;
  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;
  const vp = viewport.value;
  const cx = (containerWidth / 2 - vp.panX) / vp.zoom;
  const cy = (containerHeight / 2 - vp.panY) / vp.zoom;
  const w = 200;
  const h = 40;
  model.addNode('text', cx - w / 2, cy - h / 2, w, h);
  // Update the label of the newly created node
  const newData = JSON.parse(JSON.stringify(internalData.value)) as FlowchartData;
  const newNode = newData.nodes[newData.nodes.length - 1];
  if (newNode) {
    newNode.label = label;
    emit('update:modelValue', newData);
  }
}

function handleDelete() {
  // Don't delete nodes when editing text
  if (editingNodeId.value) return;
  if (selection.selectedNodeId.value) {
    model.removeNode(selection.selectedNodeId.value);
    selection.clearSelection();
  } else if (selection.selectedEdgeId.value) {
    model.removeEdge(selection.selectedEdgeId.value);
    selection.clearSelection();
  } else if (selection.selectedFreeLineId.value) {
    model.removeFreeLine(selection.selectedFreeLineId.value);
    selection.clearSelection();
  }
}

function nudgeNode(e: KeyboardEvent, dx: number, dy: number) {
  if (!selection.selectedNodeId.value) return;
  e.preventDefault();
  const node = model.getNode(selection.selectedNodeId.value);
  if (node) {
    const step = e.shiftKey ? GRID_SIZE * 4 : GRID_SIZE;
    model.setNodePosition(node.id, node.x + dx * step, node.y + dy * step);
  }
}

function onCanvasClick() {
  if (!isDrawing()) {
    commitEditing();
    selection.clearSelection();
  }
}
function onNodeClick(nodeId: string) {
  if (isDrawing()) return;
  commitEditing();
  selection.selectNode(nodeId);
  emit('nodeSelect', nodeId);
}
function onNodeDblClick(nodeId: string) {
  cancelEditing();
  editingNodeId.value = nodeId;
  editingKey.value++;
  emit('nodeDblClick', nodeId);
}
function onEdgeClick(edgeId: string) {
  if (isDrawing()) return;
  selection.selectEdge(edgeId);
  emit('edgeSelect', edgeId);
}
function onFreeLineClick(freeLineId: string) {
  if (isDrawing()) return;
  selection.selectFreeLine(freeLineId);
}
function onFreeLineDraw(x1: number, y1: number, x2: number, y2: number) {
  model.addFreeLine(x1, y1, x2, y2);
  if (lineToolActive.value) lineToolActive.value = false;
}

function onFreeLineMove(freeLineId: string, x1: number, y1: number, x2: number, y2: number) {
  model.moveFreeLine(freeLineId, x1, y1, x2, y2);
}

function onAnchorMouseDown(nodeId: string, anchor: AnchorPosition) {
  const node = model.getNode(nodeId);
  if (node) {
    const pt = getAnchorDisplayPoint(node, anchor);
    startDrawing(nodeId, anchor, pt.x, pt.y);
  }
}

function onAnchorMouseUp(nodeId: string, anchor: AnchorPosition) {
  if (isDrawing()) finishDrawing(nodeId, anchor);
}
function onDrawingCancel() {
  cancelDrawing();
}
function onDrawingUpdate(cx: number, cy: number) {
  if (isDrawing()) updateDrawing(cx, cy);
}
function onCanvasDrop(nodeType: NodeType, cx: number, cy: number, snapSize: number) {
  sidebar.createNodeAt(nodeType, cx, cy, snapSize);
}

function canvasPointFromClient(clientX: number, clientY: number) {
  const rect = canvasAreaRef.value?.getBoundingClientRect();
  if (!rect) return null;
  return {
    x: (clientX - rect.left - viewport.value.panX) / viewport.value.zoom,
    y: (clientY - rect.top - viewport.value.panY) / viewport.value.zoom,
  };
}

function isClientPointInCanvas(clientX: number, clientY: number): boolean {
  const rect = canvasAreaRef.value?.getBoundingClientRect();
  if (!rect) return false;
  return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
}

function currentSnapSize(): number {
  const z = viewport.value.zoom;
  if (z >= 10) return GRID_SIZE / 10;
  if (z >= 5) return GRID_SIZE / 5;
  if (z >= 2) return GRID_SIZE / 2;
  if (z <= 0.1) return GRID_SIZE * 8;
  if (z <= 0.25) return GRID_SIZE * 4;
  if (z <= 0.5) return GRID_SIZE * 2;
  return GRID_SIZE;
}

function onSidebarNodePointerDragStart(nodeType: NodeType, clientX: number, clientY: number) {
  sidebarNodeDrag.value = { nodeType, clientX, clientY };
}

function onSidebarNodePointerDragMove(clientX: number, clientY: number) {
  if (!sidebarNodeDrag.value) return;
  sidebarNodeDrag.value = { ...sidebarNodeDrag.value, clientX, clientY };
}

function onSidebarNodePointerDragEnd(clientX: number, clientY: number) {
  const drag = sidebarNodeDrag.value;
  sidebarNodeDrag.value = null;
  if (!drag || !isClientPointInCanvas(clientX, clientY)) return;
  const point = canvasPointFromClient(clientX, clientY);
  if (!point) return;
  sidebar.createNodeAt(drag.nodeType, point.x, point.y, currentSnapSize());
}

function onSidebarNodePointerDragCancel() {
  sidebarNodeDrag.value = null;
}

function createFreeLineAtClient(clientX: number, clientY: number) {
  if (!isClientPointInCanvas(clientX, clientY)) return;
  const point = canvasPointFromClient(clientX, clientY);
  if (!point) return;
  const ss = currentSnapSize();
  const cx = snapToGrid(point.x, ss);
  const cy = snapToGrid(point.y, ss);
  const defLen = snapToGrid(120, ss);
  model.addFreeLine(cx - defLen / 2, cy, cx + defLen / 2, cy);
}

function onSidebarLinePointerDragStart(clientX: number, clientY: number) {
  sidebarLineDrag.value = { clientX, clientY };
}

function onSidebarLinePointerDragMove(clientX: number, clientY: number) {
  if (!sidebarLineDrag.value) return;
  sidebarLineDrag.value = { clientX, clientY };
}

function onSidebarLinePointerDragEnd(clientX: number, clientY: number) {
  const drag = sidebarLineDrag.value;
  sidebarLineDrag.value = null;
  if (!drag) return;
  createFreeLineAtClient(clientX, clientY);
}

function onSidebarLinePointerDragCancel() {
  sidebarLineDrag.value = null;
}
function onCanvasWheel(event: WheelEvent, rect: DOMRect) {
  handleWheel(event, rect);
}
function onPanMove(panX: number, panY: number) {
  viewport.value.panX = panX;
  viewport.value.panY = panY;
}

function onLabelCommit(text: string) {
  if (editingNodeId.value) model.updateNodeLabel(editingNodeId.value, text);
  cancelEditing();
}

function cancelEditing() {
  editingNodeId.value = null;
}

function commitEditing() {
  if (!editingNodeId.value) return
  ;(document.activeElement as HTMLElement)?.blur();
}

const selectedNodeColor = computed(() => {
  const id = selectedNodeId.value;
  if (!id) return DEFAULT_COLOR;
  const n = model.getNode(id);
  return n?.style?.backgroundColor ?? DEFAULT_COLOR;
});

function onPickNodeColor(color: string) {
  const id = selectedNodeId.value;
  if (!id) return;
  if (color === DEFAULT_COLOR) {
    // Remove backgroundColor from style, let auto-computed values take over
    model.updateNode(id, { style: { ...model.getNode(id)?.style, backgroundColor: undefined, textColor: undefined } });
  } else {
    model.updateNode(id, { style: { ...model.getNode(id)?.style, backgroundColor: color, textColor: undefined } });
  }
}

function onEdgeRemove(edgeId: string) {
  model.removeEdge(edgeId);
}

const selectedEdgeOrLineColor = computed(() => {
  if (selectedFreeLineId.value) {
    const fl = model.getFreeLine(selectedFreeLineId.value);
    return fl?.style?.strokeColor ?? EDGE_DEFAULT_COLOR;
  }
  const id = selectedEdgeId.value;
  if (!id) return EDGE_DEFAULT_COLOR;
  const e = model.getEdge(id);
  return e?.style?.strokeColor ?? EDGE_DEFAULT_COLOR;
});

function onPickEdgeOrLineColor(color: string) {
  if (selectedFreeLineId.value) {
    if (color === EDGE_DEFAULT_COLOR) {
      model.updateFreeLineStyle(selectedFreeLineId.value, { strokeColor: undefined });
    } else {
      model.updateFreeLineStyle(selectedFreeLineId.value, { strokeColor: color });
    }
    return;
  }
  const id = selectedEdgeId.value;
  if (!id) return;
  if (color === EDGE_DEFAULT_COLOR) {
    model.updateEdgeStyle(id, { strokeColor: undefined });
  } else {
    model.updateEdgeStyle(id, { strokeColor: color });
  }
}
</script>

<style scoped>
.flowchart-container {
  display: flex;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  position: relative;
  outline: none;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.canvas-area {
  flex: 1;
  display: flex;
  position: relative;
  overflow: hidden;
}

.canvas-toolbar {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  z-index: 50;
}

.sidebar-drag-ghost {
  position: fixed;
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 44px;
  min-height: 40px;
  padding: 8px 10px;
  border: 1px solid var(--fc-sidebar-border, #ddd);
  border-radius: 4px;
  background: var(--fc-sidebar-bg, #f5f5f5);
  color: var(--fc-sidebar-label-color, #333);
  box-shadow: 0 8px 22px rgb(0 0 0 / 18%);
  opacity: 0.82;
  pointer-events: none;
  transform: translate(-50%, -50%);
}

.sidebar-drag-ghost-icon {
  flex-shrink: 0;
}

.sidebar-drag-ghost-label {
  font-size: 12px;
  color: var(--fc-sidebar-label-color, #333);
  white-space: nowrap;
}

.canvas-tb-btn {
  width: 28px;
  height: 28px;
  border: 1px solid var(--fc-sidebar-border, #ddd);
  border-radius: 4px;
  background: var(--fc-bar-bg, #fff);
  color: var(--fc-sidebar-label-color, #333);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: background 0.15s, opacity 0.15s;
  opacity: 0.9;
}

.canvas-tb-btn:hover:not(:disabled) {
  background: var(--fc-sidebar-item-hover-bg, #e8e8e8);
  opacity: 1;
}

.canvas-tb-btn:disabled {
  opacity: 0.35;
  cursor: default;
}

.canvas-tb-delete:hover:not(:disabled) {
  background: #fee2e2;
  color: #dc2626;
}
</style>
