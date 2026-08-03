<template>
  <g
    :data-edge-id="edge.id"
    class="flowchart-edge"
    :class="{ selected: isSelected }"
    @click.stop="$emit('click', edge.id)"
    @dblclick.stop="$emit('dblClick', edge.id)"
  >
    <!-- Hit area (wider invisible path) -->
    <path
      :d="pathD"
      fill="none"
      stroke="transparent"
      :stroke-width="hitWidth"
      style="cursor: pointer;"
    />
    <!-- Visible edge path -->
    <path
      :d="pathD"
      fill="none"
      :stroke="edge.style?.strokeColor ?? '#555'"
      :stroke-width="edge.style?.strokeWidth ?? 2"
      stroke-linecap="round"
      marker-end="url(#arrowhead)"
    />
    <!-- Edge label -->
    <text
      v-if="edge.label"
      :x="labelPoint.x"
      :y="labelPoint.y"
      text-anchor="middle"
      dominant-baseline="central"
      font-size="12"
      fill="#666"
      style="pointer-events: none;"
    >
      {{ edge.label }}
    </text>
    <!-- Drag handles (visible when selected) -->
    <g v-if="isSelected" class="edge-handles">
      <circle
        :data-edge-handle="'source'"
        :data-edge-id="edge.id"
        :cx="sourcePoint.x"
        :cy="sourcePoint.y"
        r="6"
        fill="#4A90D9"
        stroke="#fff"
        stroke-width="2"
        style="cursor: grab;"
      />
      <circle
        :data-edge-handle="'target'"
        :data-edge-id="edge.id"
        :cx="targetPoint.x"
        :cy="targetPoint.y"
        r="6"
        fill="#4A90D9"
        stroke="#fff"
        stroke-width="2"
        style="cursor: grab;"
      />
    </g>
  </g>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FlowchartEdge, FlowchartNode } from '../../types'
import { getAnchorPoint } from '../../utils/anchorUtils'
import { computeOrthogonalWaypoints, buildRoundedPath } from '../../utils/edgeRouting'
import { midpoint } from '../../utils/geometry'

import type { NodeRect } from '../../utils/edgeRouting'

const props = defineProps<{
  edge: FlowchartEdge
  sourceNode: FlowchartNode
  targetNode: FlowchartNode
  isSelected: boolean
  allNodes?: NodeRect[]
}>()

defineEmits<{
  click: [edgeId: string]
  dblClick: [edgeId: string]
}>()

const cornerRadius = computed(() => props.edge.style?.cornerRadius ?? 8)
const strokeWidth = computed(() => props.edge.style?.strokeWidth ?? 2)
const hitWidth = computed(() => Math.max(strokeWidth.value + 8, 14))

const sourcePoint = computed(() => getAnchorPoint(props.sourceNode, props.edge.sourceAnchor))
const targetPoint = computed(() => getAnchorPoint(props.targetNode, props.edge.targetAnchor))

const pathD = computed(() => {
  const excludeIds = [props.edge.sourceNodeId, props.edge.targetNodeId]
  const waypoints = computeOrthogonalWaypoints(
    sourcePoint.value, props.edge.sourceAnchor,
    targetPoint.value, props.edge.targetAnchor,
    props.allNodes,
    excludeIds,
  )
  return buildRoundedPath(waypoints, cornerRadius.value)
})

const labelPoint = computed(() => {
  return midpoint(sourcePoint.value, targetPoint.value)
})
</script>

<style scoped>
.flowchart-edge {
  cursor: pointer;
}
</style>
