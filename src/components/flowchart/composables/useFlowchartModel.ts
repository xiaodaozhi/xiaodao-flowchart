import { ref, watch, type Ref } from 'vue';
import type { FlowchartData, FlowchartNode, FlowchartEdge, NodeType, AnchorPosition, NodeStyle, EdgeStyle } from '../types';
import { generateId } from '.././utils/idGenerator';

function deepClone<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

export function useFlowchartModel(
  modelValue: Ref<FlowchartData>,
  emit: (event: 'update:modelValue', value: FlowchartData) => void,
) {
  const internalData = ref<FlowchartData>(deepClone(modelValue.value));

  watch(modelValue, (newVal) => {
    internalData.value = deepClone(newVal);
  }, { deep: true });

  function commit(newData: FlowchartData) {
    internalData.value = newData;
    emit('update:modelValue', deepClone(newData));
  }

  function addNode(type: NodeType, x: number, y: number, width: number, height: number): string {
    const newNode: FlowchartNode = {
      id: generateId(),
      type,
      x,
      y,
      width,
      height,
      label: '',
      style: {},
    };
    const newData = deepClone(internalData.value);
    newData.nodes.push(newNode);
    commit(newData);
    return newNode.id;
  }

  function updateNode(id: string, changes: Partial<FlowchartNode>) {
    const newData = deepClone(internalData.value);
    const idx = newData.nodes.findIndex((n) => n.id === id);
    if (idx !== -1) {
      newData.nodes[idx] = { ...newData.nodes[idx], ...changes } as FlowchartNode;
      commit(newData);
    }
  }

  function removeNode(id: string) {
    const newData = deepClone(internalData.value);
    newData.nodes = newData.nodes.filter((n) => n.id !== id);
    newData.edges = newData.edges.filter(
      (e) => e.sourceNodeId !== id && e.targetNodeId !== id,
    );
    commit(newData);
  }

  function addEdge(
    sourceNodeId: string,
    sourceAnchor: AnchorPosition,
    targetNodeId: string,
    targetAnchor: AnchorPosition,
  ): string | null {
    const newData = deepClone(internalData.value);
    // Prevent self-connection
    if (sourceNodeId === targetNodeId) return null;
    // Prevent duplicate edges
    const exists = newData.edges.some(
      (e) =>
        e.sourceNodeId === sourceNodeId
        && e.sourceAnchor === sourceAnchor
        && e.targetNodeId === targetNodeId
        && e.targetAnchor === targetAnchor,
    );
    if (exists) return null;

    const newEdge: FlowchartEdge = {
      id: generateId(),
      sourceNodeId,
      sourceAnchor,
      targetNodeId,
      targetAnchor,
    };
    newData.edges.push(newEdge);
    commit(newData);
    return newEdge.id;
  }

  function removeEdge(id: string) {
    const newData = deepClone(internalData.value);
    newData.edges = newData.edges.filter((e) => e.id !== id);
    commit(newData);
  }

  function moveNode(id: string, dx: number, dy: number) {
    const newData = deepClone(internalData.value);
    const node = newData.nodes.find((n) => n.id === id);
    if (node) {
      node.x += dx;
      node.y += dy;
      commit(newData);
    }
  }

  function setNodePosition(id: string, x: number, y: number) {
    const newData = deepClone(internalData.value);
    const node = newData.nodes.find((n) => n.id === id);
    if (node) {
      node.x = x;
      node.y = y;
      commit(newData);
    }
  }

  function resizeNode(id: string, x: number, y: number, width: number, height: number) {
    const newData = deepClone(internalData.value);
    const node = newData.nodes.find((n) => n.id === id);
    if (node) {
      node.x = x;
      node.y = y;
      node.width = width;
      node.height = height;
      commit(newData);
    }
  }

  function updateNodeLabel(id: string, label: string) {
    updateNode(id, { label });
  }

  function updateNodeStyle(id: string, style: NodeStyle) {
    updateNode(id, {
      style: { ...internalData.value.nodes.find((n) => n.id === id)?.style, ...style },
    });
  }

  function updateEdgeLabel(id: string, label: string) {
    const newData = deepClone(internalData.value);
    const edge = newData.edges.find((e) => e.id === id);
    if (edge) {
      edge.label = label;
      commit(newData);
    }
  }

  function updateEdgeStyle(id: string, style: EdgeStyle) {
    const newData = deepClone(internalData.value);
    const edge = newData.edges.find((e) => e.id === id);
    if (edge) {
      edge.style = { ...edge.style, ...style };
      commit(newData);
    }
  }

  function getNode(id: string): FlowchartNode | undefined {
    return internalData.value.nodes.find((n) => n.id === id);
  }

  function getEdge(id: string): FlowchartEdge | undefined {
    return internalData.value.edges.find((e) => e.id === id);
  }

  return {
    internalData,
    addNode,
    updateNode,
    removeNode,
    addEdge,
    removeEdge,
    moveNode,
    setNodePosition,
    resizeNode,
    updateNodeLabel,
    updateNodeStyle,
    updateEdgeLabel,
    updateEdgeStyle,
    getNode,
    getEdge,
  };
}
