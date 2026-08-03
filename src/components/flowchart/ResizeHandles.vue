<template>
  <g class="resize-handles">
    <rect
      v-for="handle in handles"
      :key="handle.id"
      :data-handle-id="handle.id"
      :x="handle.x - sz / 2"
      :y="handle.y - sz / 2"
      :width="sz"
      :height="sz"
      fill="#fff"
      stroke="#4A90D9"
      stroke-width="1.5"
      :style="{ cursor: handle.cursor }"
      rx="1"
    />
  </g>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FlowchartNode, CanvasViewport, ResizeHandleId } from '../../types'

const props = defineProps<{
  node: FlowchartNode
  viewport: CanvasViewport
}>()

interface HandleDef {
  id: ResizeHandleId
  x: number
  y: number
  cursor: string
}

const sz = computed(() => Math.max(8 / props.viewport.zoom, 4))

const handles = computed<HandleDef[]>(() => {
  const { x, y, width, height } = props.node
  return [
    { id: 'top-left',     x,            y,            cursor: 'nwse-resize' },
    { id: 'top-center',   x: x + width / 2, y,            cursor: 'ns-resize' },
    { id: 'top-right',    x: x + width, y,            cursor: 'nesw-resize' },
    { id: 'middle-left',  x,            y: y + height / 2, cursor: 'ew-resize' },
    { id: 'middle-right', x: x + width, y: y + height / 2, cursor: 'ew-resize' },
    { id: 'bottom-left',  x,            y: y + height, cursor: 'nesw-resize' },
    { id: 'bottom-center',x: x + width / 2, y: y + height, cursor: 'ns-resize' },
    { id: 'bottom-right', x: x + width, y: y + height, cursor: 'nwse-resize' },
  ]
})
</script>