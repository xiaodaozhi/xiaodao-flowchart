# xiaodao-flowchart

A pure frontend interactive flowchart editor component built with Vue 3 + TypeScript + Vite.

## Features

- **5 node types** — Rectangle, diamond, ellipse, parallelogram, and free-text nodes. All support drag, resize, inline label editing, and custom styling.
- **Smart orthogonal edges** — Automatic orthogonal path routing with multi-segment polylines, node self-avoidance, and third-party node detour.
- **Draggable edge handles** — Selected edges display draggable source/target endpoint handles for reconnecting to other nodes.
- **Canvas controls** — Mouse wheel zoom (0.1x ~ 10x), right/middle-click pan, adaptive multi-level dot grid.
- **Node sidebar** — Drag node templates from the sidebar onto the canvas to create nodes. Responsive layout (auto-collapses on mobile).
- **8-way resize** — 8 resize handles appear on selected nodes, with aspect ratio constraints and minimum size enforcement.
- **Inline text editing** — Double-click a node to enter edit mode with multi-line text support.
- **Light/dark themes** — CSS custom property driven, 60+ variables covering all UI elements. Toggle via the `theme` prop.
- **Internationalization** — Built-in Chinese (zh-CN) and English (en-US). Switch via the `locale` prop.
- **Preset color palettes** — 18 colors for nodes + 15 colors for edges, with automatic text contrast calculation (black/white).
- **Keyboard shortcuts** — Delete/Backspace to remove, arrow keys to nudge (Shift accelerates 4x), Escape to cancel.
- **v-model data-driven** — Single source of truth with two-way binding via `update:modelValue` event.
- **Full TypeScript coverage** — Complete type definitions, with composable types exported for external use.

## Tech Stack

| Technology | Version |
|------------|---------|
| Vue | ^3.5.40 |
| TypeScript | ~6.0.2 |
| Vite | ^8.2.0 |
| nanoid | ^5.1.16 |

## Quick Start

### Install

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Preview

```bash
npm run preview
```

## Usage

```vue
<template>
  <FlowchartContainer
    v-model="data"
    theme="light"
    locale="en-US"
    @node-select="onNodeSelect"
    @node-dbl-click="onNodeDblClick"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { FlowchartContainer } from './components/flowchart'
import type { FlowchartData } from './components/flowchart'

const data = ref<FlowchartData>({
  nodes: [
    { id: 'start', type: 'rectangle', x: 200, y: 150, width: 160, height: 80, label: 'Start', style: { backgroundColor: '#E8F5E9' } },
    { id: 'decision', type: 'diamond', x: 220, y: 320, width: 120, height: 120, label: 'Condition?', style: { backgroundColor: '#FFF3E0' } },
    { id: 'end', type: 'ellipse', x: 200, y: 680, width: 160, height: 100, label: 'End', style: { backgroundColor: '#F3E5F5' } },
  ],
  edges: [
    { id: 'e1', sourceNodeId: 'start', sourceAnchor: 'bottom', targetNodeId: 'decision', targetAnchor: 'top' },
    { id: 'e2', sourceNodeId: 'decision', sourceAnchor: 'bottom', targetNodeId: 'end', targetAnchor: 'top' },
  ],
})

function onNodeSelect(nodeId: string | null) { /* ... */ }
function onNodeDblClick(nodeId: string) { /* ... */ }
</script>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `FlowchartData` | — | Flowchart data (v-model two-way binding) |
| `theme` | `'light' \| 'dark'` | `'light'` | Color theme |
| `locale` | `'zh-CN' \| 'en-US'` | `'zh-CN'` | UI language |
| `mobile` | `boolean` | `false` | Mobile mode (sidebar collapsed) |
| `width` | `string \| number` | — | Container width |
| `height` | `string \| number` | — | Container height |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | `FlowchartData` | Emitted when data changes |
| `nodeSelect` | `nodeId: string \| null` | Node selected / deselected |
| `nodeDblClick` | `nodeId: string` | Node double-clicked |
| `edgeSelect` | `edgeId: string \| null` | Edge selected / deselected |

## Data Structures

### FlowchartData

```typescript
interface FlowchartData {
  nodes: FlowchartNode[]
  edges: FlowchartEdge[]
}
```

### FlowchartNode

```typescript
interface FlowchartNode {
  id: string
  type: 'rectangle' | 'diamond' | 'ellipse' | 'parallelogram' | 'text'
  x: number
  y: number
  width: number
  height: number
  label: string
  style?: {
    backgroundColor?: string
    borderColor?: string
    borderWidth?: number
    textColor?: string
    fontSize?: number
    borderRadius?: number
    opacity?: number
  }
}
```

### FlowchartEdge

```typescript
interface FlowchartEdge {
  id: string
  sourceNodeId: string
  sourceAnchor: 'top' | 'right' | 'bottom' | 'left'
  targetNodeId: string
  targetAnchor: 'top' | 'right' | 'bottom' | 'left'
  label?: string
  style?: {
    strokeColor?: string
    strokeWidth?: number
    cornerRadius?: number
  }
}
```

## Project Structure

```
src/
├── main.ts                              # App entry point
├── App.vue                              # Demo page
├── style.css                            # Global style reset
└── components/flowchart/
    ├── index.ts                         # Component & type exports
    ├── FlowchartContainer.vue           # Top-level container (state orchestration)
    ├── FlowchartCanvas.vue              # SVG canvas (core interaction)
    ├── FlowchartNode.vue                # Node rendering (5 shapes)
    ├── FlowchartEdge.vue                # Edge rendering (orthogonal routing)
    ├── NodeSidebar.vue                  # Node template sidebar
    ├── AnchorPoints.vue                 # Anchor point controls
    ├── ResizeHandles.vue                # Resize handles (8 directions)
    ├── TextNodeEditor.vue              # Inline text editor
    ├── NodeActionBar.vue               # Node action bar (color / delete)
    ├── EdgeActionBar.vue               # Edge action bar (color / delete)
    ├── types/
    │   └── index.ts                    # All type definitions & constants
    ├── utils/
    │   ├── anchorUtils.ts              # Anchor position calculation
    │   ├── colorUtils.ts               # Color presets & contrast
    │   ├── edgeRouting.ts              # Orthogonal path routing engine
    │   ├── geometry.ts                 # Geometry utility functions
    │   └── idGenerator.ts              # Unique ID generation
    ├── composables/
    │   ├── useFlowchartModel.ts        # Data model CRUD
    │   ├── useCanvasPanZoom.ts         # Canvas pan & zoom
    │   ├── useEdgeDrawing.ts           # Edge drawing state machine
    │   ├── useDragFromSidebar.ts       # Sidebar drag-to-create
    │   ├── useKeyboard.ts             # Keyboard shortcuts
    │   ├── useSelection.ts            # Selection state management
    │   ├── useNodeDrag.ts             # Node dragging
    │   ├── useNodeResize.ts           # Node resizing
    │   ├── useFlowchartContext.ts      # Dependency injection (theme / locale)
    │   └── useFlowchartI18n.ts        # Internationalization
    └── style/
        └── theme.css                   # Theme CSS custom properties
```

## Interaction Guide

| Action | Method |
|--------|--------|
| Create a node | Drag a template from the left sidebar onto the canvas |
| Move a node | Drag the node |
| Resize a node | Drag any of the 8 resize handles |
| Edit text | Double-click the node |
| Create an edge | Drag from a source node's anchor to a target node's anchor |
| Reconnect an edge | Select the edge, then drag its endpoint handle |
| Select node / edge | Single-click |
| Delete | Select and press Delete / Backspace, or click the action bar delete button |
| Change color | Select and click a color button in the bottom action bar |
| Pan canvas | Right-click drag or middle-click drag on empty area |
| Zoom canvas | Mouse wheel |
| Nudge a node | Arrow keys (hold Shift to accelerate) |
| Cancel operation | Escape |

## Edge Routing Algorithm

The project implements a complete orthogonal edge routing engine (`edgeRouting.ts`):

- **Basic path construction** — Automatically selects L-shaped, Z-shaped, or U-shaped polyline paths based on source/target anchor directions.
- **Node self-avoidance** — Paths automatically avoid the source and target nodes themselves during generation.
- **Third-party node detour** — Detects when a path passes through other nodes and generates detour polylines.
- **Grid-based path search** — For complex scenarios, builds a grid graph and uses Dijkstra shortest-path search with turn penalties.
- **Path cleaning** — Automatically merges collinear segments and deduplicates consecutive points.

## Theme Customization

The project implements its theme system through 40+ CSS custom properties, covering all UI elements including the canvas, sidebar, action bars, editor, nodes, and edges. Light and dark theme variable sets are defined in `theme.css` and toggled via the `.theme-dark` class.

To create a custom theme, override the corresponding CSS custom properties in your project.

## Browser Compatibility

Supports all modern browsers (Chrome, Firefox, Safari, Edge). Built on SVG + CSS Custom Properties + Pointer Events API.

## License

MIT