<template>
  <g v-if="visible" class="anchor-points">
    <circle
      v-for="anchor in anchors"
      :key="anchor.position"
      :data-anchor="anchor.position"
      :cx="anchor.x"
      :cy="anchor.y"
      :r="isHighlighted(anchor.position) ? r * 1.5 : r"
      fill="#fff"
      stroke="#4A90D9"
      stroke-width="1.5"
      :style="{ cursor: 'crosshair', transition: 'r 0.15s' }"
    />
  </g>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FlowchartNode, AnchorPosition, CanvasViewport } from './types'
import { getAnchorDisplayPoint } from './utils/anchorUtils'

const props = defineProps<{
  node: FlowchartNode
  visible: boolean
  viewport: CanvasViewport
  hoveredAnchor?: AnchorPosition | null
  hoveredNodeId?: string | null
}>()

const r = computed(() => Math.max(5 / props.viewport.zoom, 3))

const anchors = computed(() => {
  const positions = ['top', 'right', 'bottom', 'left'] as const
  return positions.map(pos => ({ position: pos, ...getAnchorDisplayPoint(props.node, pos) }))
})

function isHighlighted(pos: AnchorPosition): boolean {
  return props.hoveredNodeId === props.node.id && props.hoveredAnchor === pos
}
</script>