<template>
  <div class="text-editor-overlay" :style="editorStyle">
    <textarea
      v-model="editText"
      class="editor-input"
      :style="inputStyle"
      :rows="rows"
      @keydown.enter.exact="commit"
      @keydown.escape="() => $emit('cancel')"
      @blur="commit"
      ref="inputRef"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, nextTick } from 'vue'
import type { CanvasViewport } from '../../types'

const props = defineProps<{
  cx: number
  cy: number
  width: number
  text: string
  fontSize?: number
  color?: string
  viewport: CanvasViewport
}>()

const emit = defineEmits<{
  commit: [text: string]
  cancel: []
}>()

const editText = ref(props.text)
const inputRef = ref<HTMLTextAreaElement | null>(null)

const editorStyle = computed(() => {
  const { panX, panY, zoom } = props.viewport
  const w = Math.max(props.width * zoom, 80)
  return {
    left: `${props.cx * zoom + panX}px`,
    top: `${props.cy * zoom + panY}px`,
    width: `${w}px`,
    transform: 'translate(-50%, -50%)',
  }
})

const inputStyle = computed(() => ({
  fontSize: `${(props.fontSize ?? 14) * props.viewport.zoom}px`,
  color: props.color ?? '#000',
}))

const rows = computed(() => {
  return Math.max(1, (editText.value.match(/\n/g) || []).length + 1)
})

function commit() {
  if (editText.value !== props.text) {
    emit('commit', editText.value)
  } else {
    emit('cancel')
  }
}

onMounted(async () => {
  await nextTick()
  inputRef.value?.focus()
  inputRef.value?.select()
})
</script>

<style scoped>
.text-editor-overlay {
  position: absolute;
  z-index: 100;
  pointer-events: auto;
}

.editor-input {
  width: 100%;
  border: 2px solid var(--fc-editor-focus-border);
  border-radius: 2px;
  padding: 4px 8px;
  display: block;
  outline: none;
  font-family: inherit;
  line-height: 1.4;
  box-sizing: border-box;
  background: var(--fc-editor-bg);
  text-align: center;
  resize: none;
  overflow: hidden;
}
</style>