<template>
  <div id="app">
    <div class="toolbar">
      <span class="toolbar-title">Flowchart Demo</span>
      <button @click="loadSampleData" class="toolbar-btn">加载示例</button>
      <button @click="clearAll" class="toolbar-btn">清空</button>
      <span class="toolbar-info">
        节点: {{ data.nodes.length }} | 连线: {{ data.edges.length }}
      </span>
      <span v-if="selectedNodeId" class="toolbar-info"> 选中: {{ selectedNodeId }} </span>
    </div>
    <FlowchartContainer v-model="data" :theme="'dark'" :locale="'en-US'" @node-select="onNodeSelect" @node-dbl-click="onNodeDblClick" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import FlowchartContainer from './components/flowchart/FlowchartContainer.vue'
import type { FlowchartData } from './components/flowchart/types/index.ts'

const data = ref<FlowchartData>({ nodes: [], edges: [] })
const selectedNodeId = ref<string | null>(null)

function onNodeSelect(nodeId: string | null) { selectedNodeId.value = nodeId }
function onNodeDblClick(nodeId: string) { console.log('Double clicked node:', nodeId) }

function loadSampleData() {
  data.value = {
    nodes: [
      { id: 'n1', type: 'rectangle', x: 200, y: 150, width: 160, height: 80, label: '开始', style: { backgroundColor: '#E8F5E9' } },
      { id: 'n2', type: 'diamond', x: 220, y: 320, width: 120, height: 120, label: '条件判断?', style: { backgroundColor: '#FFF3E0' } },
      { id: 'n3', type: 'rectangle', x: 100, y: 520, width: 160, height: 80, label: '处理 A', style: { backgroundColor: '#E3F2FD' } },
      { id: 'n4', type: 'rectangle', x: 340, y: 520, width: 160, height: 80, label: '处理 B', style: { backgroundColor: '#FCE4EC' } },
      { id: 'n5', type: 'ellipse', x: 200, y: 680, width: 160, height: 100, label: '结束', style: { backgroundColor: '#F3E5F5' } },
      { id: 'n6', type: 'parallelogram', x: 450, y: 150, width: 160, height: 80, label: '输入/输出', style: { backgroundColor: '#E0F7FA' } },
      { id: 'n7', type: 'text', x: 450, y: 300, width: 200, height: 60, label: '说明文字\n这是自由文本节点' },
    ],
    edges: [
      { id: 'e1', sourceNodeId: 'n1', sourceAnchor: 'bottom', targetNodeId: 'n2', targetAnchor: 'top' },
      { id: 'e2', sourceNodeId: 'n2', sourceAnchor: 'left', targetNodeId: 'n3', targetAnchor: 'top' },
      { id: 'e3', sourceNodeId: 'n2', sourceAnchor: 'right', targetNodeId: 'n4', targetAnchor: 'top' },
      { id: 'e4', sourceNodeId: 'n3', sourceAnchor: 'bottom', targetNodeId: 'n5', targetAnchor: 'left' },
      { id: 'e5', sourceNodeId: 'n4', sourceAnchor: 'bottom', targetNodeId: 'n5', targetAnchor: 'right' },
      { id: 'e6', sourceNodeId: 'n1', sourceAnchor: 'right', targetNodeId: 'n6', targetAnchor: 'left' },
    ],
  }
}

function clearAll() { data.value = { nodes: [], edges: [] } }

watch(data, (newData) => {
  console.log('Data updated:', newData.nodes.length, 'nodes,', newData.edges.length, 'edges')
}, { deep: true })
</script>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 100%; height: 100%; overflow: hidden; }
#app { display: flex; flex-direction: column; width: 100%; height: 100vh; }
.toolbar { display: flex; align-items: center; gap: 12px; padding: 8px 16px; background: #333; color: #fff; font-size: 13px; flex-shrink: 0; }
.toolbar-title { font-weight: 600; font-size: 14px; margin-right: 8px; }
.toolbar-btn { padding: 4px 12px; border: 1px solid #666; border-radius: 4px; background: #444; color: #fff; font-size: 12px; cursor: pointer; transition: background 0.15s; }
.toolbar-btn:hover { background: #555; }
.toolbar-info { color: #aaa; font-size: 12px; }
</style>

