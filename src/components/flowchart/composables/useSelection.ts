import { ref } from 'vue';

export function useSelection() {
  const selectedNodeId = ref<string | null>(null);
  const selectedEdgeId = ref<string | null>(null);

  function selectNode(id: string | null) {
    selectedNodeId.value = id;
    selectedEdgeId.value = null;
  }

  function selectEdge(id: string | null) {
    selectedEdgeId.value = id;
    selectedNodeId.value = null;
  }

  function clearSelection() {
    selectedNodeId.value = null;
    selectedEdgeId.value = null;
  }

  return {
    selectedNodeId,
    selectedEdgeId,
    selectNode,
    selectEdge,
    clearSelection,
  };
}
