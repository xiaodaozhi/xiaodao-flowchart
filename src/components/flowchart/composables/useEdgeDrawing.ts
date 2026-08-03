import { ref } from 'vue'
import type { EdgeDrawingState, AnchorPosition } from '../types'

export function useEdgeDrawing(
  addEdge: (
    sourceNodeId: string,
    sourceAnchor: AnchorPosition,
    targetNodeId: string,
    targetAnchor: AnchorPosition,
  ) => string | null,
) {
  const drawingState = ref<EdgeDrawingState | null>(null)

  function startDrawing(sourceNodeId: string, sourceAnchor: AnchorPosition, mouseX: number, mouseY: number) {
    drawingState.value = {
      active: true,
      sourceNodeId,
      sourceAnchor,
      currentMouseX: mouseX,
      currentMouseY: mouseY,
    }
  }

  function updateDrawing(mouseX: number, mouseY: number) {
    if (drawingState.value) {
      drawingState.value.currentMouseX = mouseX
      drawingState.value.currentMouseY = mouseY
    }
  }

  function finishDrawing(targetNodeId: string, targetAnchor: AnchorPosition): string | null {
    if (!drawingState.value) return null

    // Prevent self-connection
    if (drawingState.value.sourceNodeId === targetNodeId) {
      cancelDrawing()
      return null
    }

    const edgeId = addEdge(
      drawingState.value.sourceNodeId,
      drawingState.value.sourceAnchor,
      targetNodeId,
      targetAnchor,
    )
    cancelDrawing()
    return edgeId
  }

  function cancelDrawing() {
    drawingState.value = null
  }

  function isDrawing(): boolean {
    return drawingState.value?.active ?? false
  }

  return {
    drawingState,
    startDrawing,
    updateDrawing,
    finishDrawing,
    cancelDrawing,
    isDrawing,
  }
}
