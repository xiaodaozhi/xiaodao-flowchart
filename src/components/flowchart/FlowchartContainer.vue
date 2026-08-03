<template>
  <div
    class="flowchart-container"
    :class="{ 'theme-dark': resolvedTheme === 'dark' }"
    :style="{ width: resolvedWidth, height: resolvedHeight }"
    tabindex="0"
    @drop.prevent
    @dragover.prevent
  >
    <NodeSidebar :templates="templates" />
    <div class="canvas-area">
      <FlowchartCanvas
        :nodes="internalData.nodes"
        :edges="internalData.edges"
        :viewport="viewport"
        :selected-node-id="selectedNodeId"
        :selected-edge-id="selectedEdgeId"
        :drawing-state="drawingState"
        :editing-node-id="editingNodeId"
        :editing-info="editingInfo"
        :editing-key="editingKey"
        @canvas-click="onCanvasClick"
        @node-click="onNodeClick"
        @node-dbl-click="onNodeDblClick"
        @edge-click="onEdgeClick"
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
      <NodeActionBar
        :visible="selectedNodeId !== null"
        :current-color="selectedNodeColor"
        @pick-color="onPickNodeColor"
        @delete="onDeleteSelectedNode"
      />
      <EdgeActionBar
        :visible="selectedEdgeId !== null"
        :current-color="selectedEdgeColor"
        @pick-color="onPickEdgeColor"
        @delete="onDeleteSelectedEdge"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, toRef, type Ref, provide } from 'vue';
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
import { DEFAULT_COLOR, EDGE_DEFAULT_COLOR } from './utils/colorUtils';
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
const { selectedNodeId, selectedEdgeId } = selection;

const sidebar = useDragFromSidebar(model.addNode, computed(() => createI18n(resolvedLocale.value)));
const { templates } = sidebar;

const panZoom = useCanvasPanZoom(computed(() => internalData.value.nodes));
const { viewport, handleWheel } = panZoom;

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

function handleDelete() {
  // Don't delete nodes when editing text
  if (editingNodeId.value) return;
  if (selection.selectedNodeId.value) {
    model.removeNode(selection.selectedNodeId.value);
    selection.clearSelection();
  } else if (selection.selectedEdgeId.value) {
    model.removeEdge(selection.selectedEdgeId.value);
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
  sidebar.handleDrop(
    { dataTransfer: { getData: () => nodeType } } as unknown as DragEvent,
    cx,
    cy,
    snapSize,
  );
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

function onDeleteSelectedNode() {
  const id = selectedNodeId.value;
  if (!id) return;
  model.removeNode(id);
  selection.clearSelection();
}

function onEdgeRemove(edgeId: string) {
  model.removeEdge(edgeId);
}

function onDeleteSelectedEdge() {
  const id = selectedEdgeId.value;
  if (!id) return;
  model.removeEdge(id);
  selection.clearSelection();
}

const selectedEdgeColor = computed(() => {
  const id = selectedEdgeId.value;
  if (!id) return EDGE_DEFAULT_COLOR;
  const e = model.getEdge(id);
  return e?.style?.strokeColor ?? EDGE_DEFAULT_COLOR;
});

function onPickEdgeColor(color: string) {
  const id = selectedEdgeId.value;
  if (!id) return;
  if (color === EDGE_DEFAULT_COLOR) {
    model.updateEdgeStyle(id, { strokeColor: undefined });
  } else {
    model.updateEdgeStyle(id, { strokeColor: color });
  }
}

function onEdgeReroute(edgeId: string, handle: 'source' | 'target', targetNodeId: string, targetAnchor: AnchorPosition) {
  const newData = JSON.parse(JSON.stringify(internalData.value));
  const edge = newData.edges.find((e: typeof newData.edges[number]) => e.id === edgeId);
  if (edge) {
    // Prevent self-connection
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
</style>
