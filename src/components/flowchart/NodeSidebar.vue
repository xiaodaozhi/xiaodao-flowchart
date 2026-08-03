<template>
  <div class="node-sidebar">
    <div class="sidebar-title">节点</div>
    <div
      v-for="template in templates"
      :key="template.type"
      class="sidebar-item"
      draggable="true"
      @dragstart="onDragStart($event, template.type)"
    >
      <svg :width="32" :height="24" class="sidebar-icon">
        <!-- Rectangle -->
        <rect
          v-if="template.type === 'rectangle'"
          x="2" y="2" width="28" height="20" rx="3"
          fill="#fff" stroke="#333" stroke-width="1.5"
        />
        <!-- Diamond -->
        <polygon
          v-if="template.type === 'diamond'"
          :points="`16,1 30,12 16,23 2,12`"
          fill="#fff" stroke="#333" stroke-width="1.5"
        />
        <!-- Ellipse -->
        <ellipse
          v-if="template.type === 'ellipse'"
          cx="16" cy="12" rx="14" ry="10"
          fill="#fff" stroke="#333" stroke-width="1.5"
        />
        <!-- Parallelogram -->
        <polygon
          v-if="template.type === 'parallelogram'"
          points="6,2 30,2 26,22 2,22"
          fill="#fff" stroke="#333" stroke-width="1.5"
        />
        <!-- Text -->
        <g v-if="template.type === 'text'">
          <rect x="2" y="3" width="28" height="18" rx="2" fill="#fff" stroke="#333" stroke-width="1.5" stroke-dasharray="3,2" />
          <text x="16" y="15" text-anchor="middle" font-size="12" fill="#333" font-weight="bold" font-family="serif">T</text>
        </g>
      </svg>
      <span class="sidebar-label">{{ template.label }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { NodeType, SidebarNodeTemplate } from '../../types'

defineProps<{
  templates: SidebarNodeTemplate[]
}>()

function onDragStart(event: DragEvent, type: NodeType) {
  event.dataTransfer?.setData('application/x-flowchart-node-type', type)
  event.dataTransfer!.effectAllowed = 'copy'
}
</script>

<style scoped>
.node-sidebar {
  width: 150px;
  min-width: 150px;
  background: #f5f5f5;
  border-right: 1px solid #ddd;
  padding: 8px 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  z-index: 10;
}

.sidebar-title {
  font-size: 12px;
  font-weight: 600;
  color: #666;
  padding: 4px 12px 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
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
}

.sidebar-item:hover {
  background: #e8e8e8;
}

.sidebar-item:active {
  cursor: grabbing;
}

.sidebar-icon {
  flex-shrink: 0;
}

.sidebar-label {
  font-size: 12px;
  color: #333;
  white-space: nowrap;
}
</style>
