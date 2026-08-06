<template>
  <div
    class="node-sidebar"
    :class="{ 'sidebar-collapsed': isMobile }"
  >
    <div
      v-if="!isMobile"
      class="sidebar-title"
    >
      {{ sidebarTitle }}
    </div>
    <div
      v-for="template in templates"
      :key="template.type"
      class="sidebar-item"
      :class="{ 'tool-active': selectedNodeTool === template.type }"
      draggable="true"
      @dragstart="onDragStart($event, template.type)"
      @click="onToggleNodeTool(template.type)"
      @pointerdown="onNodePointerDown($event, template.type)"
      @pointermove="onNodePointerMove"
      @pointerup="onNodePointerUp"
      @pointercancel="onNodePointerCancel"
    >
      <svg
        :width="32"
        :height="24"
        class="sidebar-icon"
      >
        <!-- Rectangle -->
        <rect
          v-if="template.type === 'rectangle'"
          x="2"
          y="2"
          width="28"
          height="20"
          rx="3"
          fill="var(--fc-sidebar-icon-fill)"
          :stroke="selectedNodeTool === template.type ? 'currentColor' : 'var(--fc-sidebar-icon-stroke)'"
          stroke-width="1.5"
        />
        <!-- Diamond -->
        <polygon
          v-if="template.type === 'diamond'"
          :points="`16,1 30,12 16,23 2,12`"
          fill="var(--fc-sidebar-icon-fill)"
          :stroke="selectedNodeTool === template.type ? 'currentColor' : 'var(--fc-sidebar-icon-stroke)'"
          stroke-width="1.5"
        />
        <!-- Ellipse -->
        <ellipse
          v-if="template.type === 'ellipse'"
          cx="16"
          cy="12"
          rx="14"
          ry="10"
          fill="var(--fc-sidebar-icon-fill)"
          :stroke="selectedNodeTool === template.type ? 'currentColor' : 'var(--fc-sidebar-icon-stroke)'"
          stroke-width="1.5"
        />
        <!-- Parallelogram -->
        <polygon
          v-if="template.type === 'parallelogram'"
          points="6,2 30,2 26,22 2,22"
          fill="var(--fc-sidebar-icon-fill)"
          :stroke="selectedNodeTool === template.type ? 'currentColor' : 'var(--fc-sidebar-icon-stroke)'"
          stroke-width="1.5"
        />
        <!-- Text -->
        <g v-if="template.type === 'text'">
          <rect
            x="2"
            y="3"
            width="28"
            height="18"
            rx="2"
            fill="var(--fc-sidebar-icon-fill)"
            :stroke="selectedNodeTool === template.type ? 'currentColor' : 'var(--fc-sidebar-icon-stroke)'"
            stroke-width="1.5"
            stroke-dasharray="3,2"
          />
          <text
            x="16"
            y="16"
            text-anchor="middle"
            font-size="12"
            :fill="selectedNodeTool === template.type ? 'currentColor' : 'var(--fc-sidebar-icon-stroke)'"
            font-weight="bold"
            font-family="serif"
          >T</text>
        </g>
      </svg>
      <span
        v-if="!isMobile"
        class="sidebar-label"
      >{{ template.label }}</span>
    </div>
    <div class="sidebar-divider" />
    <div
      class="sidebar-item"
      :class="{ 'tool-active': lineToolActive }"
      draggable="true"
      @dragstart="onDragStartLine"
      @click="onToggleLineTool"
      @pointerdown="onLinePointerDown"
      @pointermove="onLinePointerMove"
      @pointerup="onLinePointerUp"
      @pointercancel="onLinePointerCancel"
    >
      <svg
        width="32"
        height="24"
        class="sidebar-icon"
      >
        <line
          x1="4"
          y1="20"
          x2="28"
          y2="4"
          :stroke="lineToolActive ? 'currentColor' : 'var(--fc-sidebar-icon-stroke)'"
          stroke-width="2"
          stroke-linecap="round"
        />
        <circle
          cx="4"
          cy="20"
          r="2"
          :fill="lineToolActive ? 'currentColor' : 'var(--fc-sidebar-icon-stroke)'"
        />
        <circle
          cx="28"
          cy="4"
          r="2"
          :fill="lineToolActive ? 'currentColor' : 'var(--fc-sidebar-icon-stroke)'"
        />
      </svg>
      <span
        v-if="!isMobile"
        class="sidebar-label"
      >{{ lineToolLabel }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject  } from 'vue';
import './style/theme.css';
import type { NodeType, SidebarNodeTemplate } from './types';
import { localeKey, mobileKey } from './composables/useFlowchartContext';
import { createI18n } from './composables/useFlowchartI18n';

defineProps<{
  templates: SidebarNodeTemplate[];
  lineToolActive?: boolean;
  selectedNodeTool?: NodeType | null;
}>();

const emit = defineEmits<{
  toggleLineTool: [];
  toggleNodeTool: [nodeType: NodeType];
  nodePointerDragStart: [nodeType: NodeType, clientX: number, clientY: number];
  nodePointerDragMove: [clientX: number, clientY: number];
  nodePointerDragEnd: [clientX: number, clientY: number];
  nodePointerDragCancel: [];
  linePointerDragStart: [clientX: number, clientY: number];
  linePointerDragMove: [clientX: number, clientY: number];
  linePointerDragEnd: [clientX: number, clientY: number];
  linePointerDragCancel: [];
}>();

const locale = inject(localeKey);
const mobile = inject(mobileKey);

const isMobile = computed(() => mobile?.value ?? false);
const i18n = computed(() => createI18n(locale?.value ?? 'zh-CN'));
const sidebarTitle = computed(() => i18n.value.t('sidebar.title'));
const lineToolLabel = computed(() => i18n.value.t('sidebar.freeLine'));

let nodeDragPointerId: number | null = null;
let nodeDragType: NodeType | null = null;
let nodeDragStartX = 0;
let nodeDragStartY = 0;
let nodeDragMoved = false;
let suppressNextNodeClick = false;
let lineDragPointerId: number | null = null;
let lineDragStartX = 0;
let lineDragStartY = 0;
let lineDragMoved = false;
let suppressNextLineClick = false;
const POINTER_DRAG_THRESHOLD = 4;

function onDragStart(event: DragEvent, type: NodeType) {
  event.dataTransfer?.setData('application/x-flowchart-node-type', type);
  event.dataTransfer!.effectAllowed = 'copy';
}

function shouldUsePointerDrag(event: PointerEvent): boolean {
  return isMobile.value || event.pointerType === 'touch' || event.pointerType === 'pen';
}

function onNodePointerDown(event: PointerEvent, type: NodeType) {
  if (!shouldUsePointerDrag(event)) return;
  nodeDragPointerId = event.pointerId;
  nodeDragType = type;
  nodeDragStartX = event.clientX;
  nodeDragStartY = event.clientY;
  nodeDragMoved = false;
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  event.preventDefault();
  event.stopPropagation();
}

function onNodePointerMove(event: PointerEvent) {
  if (event.pointerId !== nodeDragPointerId) return;
  const moved = Math.hypot(event.clientX - nodeDragStartX, event.clientY - nodeDragStartY) >= POINTER_DRAG_THRESHOLD;
  if (moved && !nodeDragMoved && nodeDragType) {
    nodeDragMoved = true;
    emit('nodePointerDragStart', nodeDragType, nodeDragStartX, nodeDragStartY);
  }
  if (nodeDragMoved) emit('nodePointerDragMove', event.clientX, event.clientY);
  event.preventDefault();
  event.stopPropagation();
}

function onNodePointerUp(event: PointerEvent) {
  if (event.pointerId !== nodeDragPointerId) return;
  nodeDragPointerId = null;
  const type = nodeDragType;
  nodeDragType = null;
  suppressNextNodeClick = true;
  const target = event.currentTarget as HTMLElement;
  if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
  if (nodeDragMoved) {
    emit('nodePointerDragEnd', event.clientX, event.clientY);
  } else if (type) {
    emit('toggleNodeTool', type);
  }
  event.preventDefault();
  event.stopPropagation();
}

function onNodePointerCancel(event: PointerEvent) {
  if (event.pointerId !== nodeDragPointerId) return;
  nodeDragPointerId = null;
  nodeDragType = null;
  nodeDragMoved = false;
  const target = event.currentTarget as HTMLElement;
  if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
  emit('nodePointerDragCancel');
}

function onToggleNodeTool(type: NodeType) {
  if (suppressNextNodeClick) {
    suppressNextNodeClick = false;
    return;
  }
  if (nodeDragPointerId !== null) return;
  emit('toggleNodeTool', type);
}

function onToggleLineTool() {
  if (suppressNextLineClick) {
    suppressNextLineClick = false;
    return;
  }
  if (lineDragPointerId !== null) return;
  emit('toggleLineTool');
}

function onDragStartLine(event: DragEvent) {
  event.dataTransfer?.setData('application/x-flowchart-freeline', '1');
  event.dataTransfer!.effectAllowed = 'copy';
}

function onLinePointerDown(event: PointerEvent) {
  if (!shouldUsePointerDrag(event)) return;
  lineDragPointerId = event.pointerId;
  lineDragStartX = event.clientX;
  lineDragStartY = event.clientY;
  lineDragMoved = false;
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  event.preventDefault();
  event.stopPropagation();
}

function onLinePointerMove(event: PointerEvent) {
  if (event.pointerId !== lineDragPointerId) return;
  const moved = Math.hypot(event.clientX - lineDragStartX, event.clientY - lineDragStartY) >= POINTER_DRAG_THRESHOLD;
  if (moved && !lineDragMoved) {
    lineDragMoved = true;
    emit('linePointerDragStart', lineDragStartX, lineDragStartY);
  }
  if (lineDragMoved) emit('linePointerDragMove', event.clientX, event.clientY);
  event.preventDefault();
  event.stopPropagation();
}

function onLinePointerUp(event: PointerEvent) {
  if (event.pointerId !== lineDragPointerId) return;
  lineDragPointerId = null;
  suppressNextLineClick = true;
  const target = event.currentTarget as HTMLElement;
  if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
  if (lineDragMoved) {
    emit('linePointerDragEnd', event.clientX, event.clientY);
  } else {
    emit('toggleLineTool');
  }
  event.preventDefault();
  event.stopPropagation();
}

function onLinePointerCancel(event: PointerEvent) {
  if (event.pointerId !== lineDragPointerId) return;
  lineDragPointerId = null;
  lineDragMoved = false;
  const target = event.currentTarget as HTMLElement;
  if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
  emit('linePointerDragCancel');
}
</script>

<style scoped>
.node-sidebar {
  width: 150px;
  min-width: 150px;
  background: var(--fc-sidebar-bg);
  border-right: 1px solid var(--fc-sidebar-border);
  padding: 8px 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  z-index: 10;
  transition: width 0.2s, min-width 0.2s;
}

.node-sidebar.sidebar-collapsed {
  width: 48px;
  min-width: 48px;
}

.node-sidebar.sidebar-collapsed .sidebar-item {
  justify-content: center;
  padding: 8px 4px;
}

.sidebar-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--fc-sidebar-title-color);
  padding: 4px 12px 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

.sidebar-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: grab;
  transition: background 0.15s;
  border-radius: 4px;
  margin: 0 4px;
  touch-action: none;
  user-select: none;
}

.sidebar-item:hover {
  background: var(--fc-sidebar-item-hover-bg);
}

.sidebar-item:active {
  cursor: grabbing;
}

.sidebar-item.tool-active {
  background: #4A90D9;
  color: #fff;
}

.sidebar-item.tool-active .sidebar-label {
  color: #fff;
}

.sidebar-item.tool-active:hover {
  background: #3a7bc8;
}

.sidebar-divider {
  height: 1px;
  background: var(--fc-sidebar-border);
  margin: 4px 8px;
}

.sidebar-icon {
  flex-shrink: 0;
}

.sidebar-label {
  font-size: 12px;
  color: var(--fc-sidebar-label-color);
  white-space: nowrap;
}
</style>
