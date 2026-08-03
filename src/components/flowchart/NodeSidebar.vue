<template>
  <div class="node-sidebar" :class="{ 'sidebar-collapsed': isMobile }">
    <div class="sidebar-title" v-if="!isMobile">{{ sidebarTitle }}</div>
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
          fill="var(--fc-sidebar-icon-fill)" stroke="var(--fc-sidebar-icon-stroke)" stroke-width="1.5"
        />
        <!-- Diamond -->
        <polygon
          v-if="template.type === 'diamond'"
          :points="`16,1 30,12 16,23 2,12`"
          fill="var(--fc-sidebar-icon-fill)" stroke="var(--fc-sidebar-icon-stroke)" stroke-width="1.5"
        />
        <!-- Ellipse -->
        <ellipse
          v-if="template.type === 'ellipse'"
          cx="16" cy="12" rx="14" ry="10"
          fill="var(--fc-sidebar-icon-fill)" stroke="var(--fc-sidebar-icon-stroke)" stroke-width="1.5"
        />
        <!-- Parallelogram -->
        <polygon
          v-if="template.type === 'parallelogram'"
          points="6,2 30,2 26,22 2,22"
          fill="var(--fc-sidebar-icon-fill)" stroke="var(--fc-sidebar-icon-stroke)" stroke-width="1.5"
        />
        <!-- Text -->
        <g v-if="template.type === 'text'">
          <rect x="2" y="3" width="28" height="18" rx="2" fill="var(--fc-sidebar-icon-fill)" stroke="var(--fc-sidebar-icon-stroke)" stroke-width="1.5" stroke-dasharray="3,2" />
          <text x="16" y="15" text-anchor="middle" font-size="12" fill="var(--fc-sidebar-icon-stroke)" font-weight="bold" font-family="serif">T</text>
        </g>
      </svg>
      <span class="sidebar-label" v-if="!isMobile">{{ template.label }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { NodeType, SidebarNodeTemplate } from '../../types'
import { inject } from 'vue'
import { localeKey, mobileKey } from '../../composables/useFlowchartContext'
import { createI18n } from '../../composables/useFlowchartI18n'

defineProps<{
  templates: SidebarNodeTemplate[]
}>()

const locale = inject(localeKey)
const mobile = inject(mobileKey)

const isMobile = computed(() => mobile?.value ?? false)
const i18n = computed(() => createI18n(locale?.value ?? 'zh-CN'))
const sidebarTitle = computed(() => i18n.value.t('sidebar.title'))

function onDragStart(event: DragEvent, type: NodeType) {
  event.dataTransfer?.setData('application/x-flowchart-node-type', type)
  event.dataTransfer!.effectAllowed = 'copy'
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
}

.sidebar-item:hover {
  background: var(--fc-sidebar-item-hover-bg);
}

.sidebar-item:active {
  cursor: grabbing;
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