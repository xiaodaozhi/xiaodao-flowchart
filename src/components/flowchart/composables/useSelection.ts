import { ref } from 'vue';

export function useSelection() {
  const selectedNodeId = ref<string | null>(null);
  const selectedEdgeId = ref<string | null>(null);
  const selectedFreeLineId = ref<string | null>(null);

  function selectNode(id: string | null) {
    selectedNodeId.value = id;
    selectedEdgeId.value = null;
    selectedFreeLineId.value = null;
  }

  function selectEdge(id: string | null) {
    selectedEdgeId.value = id;
    selectedNodeId.value = null;
    selectedFreeLineId.value = null;
  }

  function selectFreeLine(id: string | null) {
    selectedFreeLineId.value = id;
    selectedNodeId.value = null;
    selectedEdgeId.value = null;
  }

  function clearSelection() {
    selectedNodeId.value = null;
    selectedEdgeId.value = null;
    selectedFreeLineId.value = null;
  }

  return {
    selectedNodeId,
    selectedEdgeId,
    selectedFreeLineId,
    selectNode,
    selectEdge,
    selectFreeLine,
    clearSelection,
  };
}
