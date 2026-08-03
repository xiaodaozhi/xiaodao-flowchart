<template>
  <g
    :data-node-id="node.id"
    class="flowchart-node"
    :class="{ selected: isSelected }"
    @dblclick.stop="$emit('dblClick', node.id)"
  >
    <!-- Rectangle -->
    <rect
      v-if="node.type === 'rectangle'"
      :x="node.x" :y="node.y"
      :width="node.width" :height="node.height"
      :rx="node.style?.borderRadius ?? 4"
      :fill="node.style?.backgroundColor ?? '#fff'"
      :stroke="node.style?.borderColor ?? '#333'"
      :stroke-width="node.style?.borderWidth ?? 2"
      :opacity="node.style?.opacity ?? 1"
    />

    <!-- Diamond -->
    <polygon
      v-if="node.type === 'diamond'"
      :points="diamondPoints"
      :fill="node.style?.backgroundColor ?? '#fff'"
      :stroke="node.style?.borderColor ?? '#333'"
      :stroke-width="node.style?.borderWidth ?? 2"
      :opacity="node.style?.opacity ?? 1"
    />

    <!-- Ellipse -->
    <ellipse
      v-if="node.type === 'ellipse'"
      :cx="cx" :cy="cy"
      :rx="node.width / 2" :ry="node.height / 2"
      :fill="node.style?.backgroundColor ?? '#fff'"
      :stroke="node.style?.borderColor ?? '#333'"
      :stroke-width="node.style?.borderWidth ?? 2"
      :opacity="node.style?.opacity ?? 1"
    />

    <!-- Parallelogram -->
    <polygon
      v-if="node.type === 'parallelogram'"
      :points="parallelogramPoints"
      :fill="node.style?.backgroundColor ?? '#fff'"
      :stroke="node.style?.borderColor ?? '#333'"
      :stroke-width="node.style?.borderWidth ?? 2"
      :opacity="node.style?.opacity ?? 1"
    />

    <!-- Text node -->
    <g v-if="node.type === 'text'">
      <rect
        :x="node.x" :y="node.y"
        :width="node.width" :height="node.height"
        :fill="isSelected ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.02)'"
        :stroke="isSelected ? '#999' : '#ccc'"
        :stroke-width="1"
        :stroke-dasharray="'4,3'"
        rx="2"
      />
    </g>

    <!-- Label: foreignObject for proper text centering and word wrap -->
    <foreignObject
      :x="node.x + pad"
      :y="node.y + pad"
      :width="Math.max(0, node.width - pad * 2)"
      :height="Math.max(0, node.height - pad * 2)"
      style="overflow: visible; pointer-events: none;"
    >
      <div
        xmlns="http://www.w3.org/1999/xhtml"
        :style="{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: node.type === 'text' ? 'flex-start' : 'center',
          justifyContent: 'center',
          textAlign: 'center',
          fontSize: (node.style?.fontSize ?? 14) + 'px',
          color: node.style?.textColor ?? '#000',
          opacity: node.style?.opacity ?? 1,
          lineHeight: ((node.style?.fontSize ?? 14) + 4) + 'px',
          wordBreak: 'break-word',
          whiteSpace: 'pre-wrap',
          userSelect: 'none',
          overflow: 'hidden',
        }"
      >{{ node.label }}</div>
    </foreignObject>

    <!-- Anchor points -->
    <AnchorPoints
      :node="node"
      :visible="showAnchors"
      :viewport="viewport"
      :hovered-anchor="hoveredAnchor"
      :hovered-node-id="hoveredNodeId"
    />

    <!-- Resize handles -->
    <ResizeHandles
      v-if="isSelected"
      :node="node"
      :viewport="viewport"
    />
  </g>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FlowchartNode, AnchorPosition, CanvasViewport } from '../../types'
import AnchorPoints from './AnchorPoints.vue'
import ResizeHandles from './ResizeHandles.vue'

const props = defineProps<{
  node: FlowchartNode
  isSelected: boolean
  viewport: CanvasViewport
  isEditing: boolean
  showAnchors: boolean
  hoveredAnchor?: AnchorPosition | null
  hoveredNodeId?: string | null
}>()

defineEmits<{
  dblClick: [nodeId: string]
}>()

const skew = computed(() => Math.min(15, props.node.width * 0.15))
const cx = computed(() => props.node.x + props.node.width / 2)
const cy = computed(() => props.node.y + props.node.height / 2)
const pad = computed(() => props.node.type === 'text' ? 4 : 8)

const diamondPoints = computed(() => {
  const { x, y, width, height } = props.node
  return `${x + width / 2},${y} ${x + width},${y + height / 2} ${x + width / 2},${y + height} ${x},${y + height / 2}`
})

const parallelogramPoints = computed(() => {
  const { x, y, width, height } = props.node
  const s = skew.value
  return `${x + s},${y} ${x + width},${y} ${x + width - s},${y + height} ${x},${y + height}`
})
</script>

<style scoped>
.flowchart-node {
  cursor: move;
}

.flowchart-node.selected {
  cursor: move;
}
</style>
