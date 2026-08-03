import { onMounted, onUnmounted } from 'vue'

export function useKeyboard(handlers: Record<string, (e: KeyboardEvent) => void>) {
  function onKeyDown(e: KeyboardEvent) {
    const handler = handlers[e.key]
    if (handler) {
      handler(e)
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', onKeyDown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', onKeyDown)
  })
}
