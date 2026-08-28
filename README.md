# xiaodao-flowchart

[中文](./README.ZH.md) | **English** | [Demo](https://xiaodaozhi.com/xiaodao-flowchart.html)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Vue 3](https://img.shields.io/badge/Vue-3.3+-42b883.svg)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-~6-3178C6.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.0+-646CFF.svg)](https://vitejs.dev/)
[![Downloads](https://img.shields.io/npm/d18m/xiaodao-flowchart)](https://www.npmjs.com/package/xiaodao-flowchart)

A self-contained Vue 3 component for drawing flowcharts and diagrams directly in the browser. It ships a full editing experience with multiple node shapes, smart orthogonal edge routing, a pan/zoom canvas, inline text editing, undo/redo, theming, and i18n, while staying data-driven through a single `v-model` source of truth. Everything is rendered as crisp SVG and scales cleanly at any zoom level.

![Preview](./img/preview.png)

---

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Basic Usage](#basic-usage)
- [Props](#props)
- [Events](#events)
- [Data Model](#data-model)
- [Architecture](#architecture)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Edge Routing Algorithm](#edge-routing-algorithm)
- [Theming](#theming)
- [Internationalization](#internationalization)
- [Building](#building)
- [Roadmap](#roadmap)
- [Tech Stack](#tech-stack)
- [License](#license)

---

## Features

### Core

- **5 node types**: Rectangle, diamond, ellipse, parallelogram, and free-text nodes. All support drag, resize, inline label editing, and custom styling.
- **Smart orthogonal edges**: Automatic orthogonal path routing with multi-segment polylines, node self-avoidance, and third-party node detour.
- **Draggable edge handles**: Selected edges display draggable source/target endpoint handles for reconnecting to other nodes (re-routing).
- **Free lines**: Draw standalone connector lines on the canvas (independent of nodes), with selectable and movable endpoints.
- **Node sidebar**: Drag node templates from the sidebar onto the canvas to create nodes. Responsive layout (auto-collapses on mobile).
- **8-way resize**: 8 resize handles appear on selected nodes, with aspect-ratio constraints and minimum-size enforcement.
- **Inline text editing**: Double-click a node to enter edit mode with multi-line text support.
- **Preset color palettes**: 18 colors for nodes and 15 colors for edges, with automatic text-contrast calculation (black or white).
- **Light / dark themes**: Driven by 60+ CSS custom properties (`--fc-*`). Toggle via the `theme` prop.
- **Internationalization**: Built-in Chinese (`zh-CN`) and English (`en-US`). Switch via the `locale` prop.
- **Undo / Redo**: Full state snapshots of the diagram data (up to 50 steps).
- **Cut / Copy / Paste**: Internal clipboard for nodes, edges, and free lines, plus external plain-text paste (creates a text node at the viewport center).
- **`v-model` data-driven**: Single source of truth with two-way binding via the `update:modelValue` event.

### Interaction

- **Canvas controls**: Mouse-wheel zoom (0.1x to 10x), right or middle-click pan, and an adaptive multi-level dot grid.
- **Node drag and resize**: Drag nodes freely; 8 resize handles with aspect-ratio constraints and a minimum size.
- **Connection drawing**: Drag from a node anchor to another node or anchor to create an edge; hover an edge to reveal draggable endpoint handles for re-routing.
- **Free-line drawing**: Use the sidebar line tool to draw standalone connector lines, then drag their endpoints.
- **Selection**: Click to select a node, edge, or free line; click the canvas to clear; use the keyboard arrows to nudge.
- **Sidebar drag-create**: Drag node templates from the sidebar onto the canvas (responsive, auto-collapses on mobile).
- **Keyboard shortcuts**: Undo/redo, cut/copy/paste, delete, arrow nudge (Shift accelerates 4x), and Escape to cancel.
- **Touch and mobile**: The `mobile` prop collapses the sidebar and optimizes touch handling.

### Visual

- **Light / dark theme**: Full color palette via 60+ CSS custom properties.
- **Internationalization**: English and Chinese out of the box; all toolbar and tooltip labels auto-localize.
- **SVG rendering**: A pure SVG canvas with a single world-space transform group, staying crisp at any zoom.
- **Preset palettes**: 18 node colors and 15 edge colors with automatic contrast.

---

## Installation

```bash
# pnpm (recommended)
pnpm add xiaodao-flowchart

# npm
npm install xiaodao-flowchart

# yarn
yarn add xiaodao-flowchart
```

Import the component and its stylesheet:

```ts
import FlowchartContainer from 'xiaodao-flowchart'
import 'xiaodao-flowchart/style.css'
```

### Peer Dependencies

- `vue` `^3.3.0`

---

## Quick Start

```bash
# Clone the repository
git clone https://github.com/xiaodaozhi/xiaodao-flowchart.git
cd xiaodao-flowchart

# Install dependencies
pnpm install

# Start the dev server
pnpm dev
```

Navigate to `http://localhost:5173` to see the demo application (`src/App.vue`).

---

## Basic Usage

```vue
<template>
  <FlowchartContainer
    v-model="data"
    theme="light"
    locale="zh-CN"
    :width="800"
    :height="600"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import FlowchartContainer from 'xiaodao-flowchart'
import 'xiaodao-flowchart/style.css'
import type { FlowchartData } from 'xiaodao-flowchart'

const data = ref<FlowchartData>({
  nodes: [
    { id: 'n1', type: 'rectangle', x: 80, y: 80, width: 160, height: 60, label: 'Start' },
    { id: 'n2', type: 'diamond', x: 80, y: 220, width: 160, height: 80, label: 'Decision?' },
  ],
  edges: [
    { id: 'e1', sourceNodeId: 'n1', sourceAnchor: 'bottom', targetNodeId: 'n2', targetAnchor: 'top' },
  ],
})
</script>
```

---

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` (v-model) | `FlowchartData` | `[]` | Diagram data, bound with `v-model` (two-way). |
| `theme` | `'light' \| 'dark'` | `'light'` | Theme mode. |
| `locale` | `'zh-CN' \| 'en-US'` | `'zh-CN'` | Language for built-in labels. |
| `mobile` | `boolean` | `false` | Mobile mode: collapses the sidebar and optimizes touch handling. |
| `width` | `string \| number` | `100%` | Container width (a number means pixels). |
| `height` | `string \| number` | `100%` / `100vh` | Container height (a number means pixels). |

---

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | `FlowchartData` | Emitted on every data change (the `v-model` payload). |
| `nodeSelect` | `string \| null` | Selected node id, or `null` when the selection is cleared. |
| `nodeDblClick` | `string` | Node id on double-click (enters inline edit). |
| `edgeSelect` | `string \| null` | Selected edge id, or `null` when the selection is cleared. |

---

## Data Model

### `FlowchartData`

The external data format used for `v-model` two-way binding:

```typescript
interface FlowchartData {
  nodes: FlowchartNode[]
  edges: FlowchartEdge[]
  freeLines?: FreeLine[]
}
```

- **`nodes`**: Array of diagram nodes.
- **`edges`**: Array of connections between nodes.
- **`freeLines`**: Optional standalone connector lines that are not attached to nodes.

### `FlowchartNode`

```typescript
interface FlowchartNode {
  id: string
  type: 'rectangle' | 'diamond' | 'ellipse' | 'parallelogram' | 'text'
  x: number
  y: number
  width: number
  height: number
  label: string
  style?: NodeStyle
}
```

### `FlowchartEdge`

```typescript
interface FlowchartEdge {
  id: string
  sourceNodeId: string
  sourceAnchor: 'top' | 'right' | 'bottom' | 'left'
  targetNodeId: string
  targetAnchor: 'top' | 'right' | 'bottom' | 'left'
  label?: string
  style?: EdgeStyle
}
```

### `FreeLine`

```typescript
interface FreeLine {
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
  style?: FreeLineStyle
}
```

### `NodeStyle` / `EdgeStyle` / `FreeLineStyle`

```typescript
interface NodeStyle {
  backgroundColor?: string
  borderColor?: string
  borderWidth?: number
  textColor?: string
  fontSize?: number
  borderRadius?: number
  opacity?: number
}

interface EdgeStyle {
  strokeColor?: string
  strokeWidth?: number
  cornerRadius?: number
}

interface FreeLineStyle {
  strokeColor?: string
  strokeWidth?: number
}
```

### Type Exports

```typescript
import FlowchartContainer from 'xiaodao-flowchart'

import type {
  FlowchartData,
  FlowchartNode,
  FlowchartEdge,
  FreeLine,
  FreeLineStyle,
  NodeType,
  AnchorPosition,
  NodeStyle,
  EdgeStyle,
  SidebarNodeTemplate,
  Theme,
  Locale,
} from 'xiaodao-flowchart'
```

All model and style types are exported for external use.

---

## Architecture

```src/
├── main.ts                            # Demo entry
├── App.vue                            # Demo application (also the build:demo entry)
└── components/
    └── flowchart/
        ├── index.ts                   # Library entry: component + types barrel
        ├── FlowchartContainer.vue     # Root component: toolbar + sidebar + canvas + events
        ├── FlowchartCanvas.vue        # SVG canvas: rendering + unified pointer-event dispatch
        ├── FlowchartNode.vue          # Node shape rendering (SVG + foreignObject label)
        ├── FlowchartEdge.vue          # Edge orthogonal routing + arrow marker
        ├── NodeSidebar.vue            # Sidebar drag source (node/line templates)
        ├── NodeActionBar.vue          # Node color picker
        ├── EdgeActionBar.vue          # Edge / free-line color picker
        ├── composables/
        │   ├── useFlowchartContext.ts  # provide/inject keys for theme / locale / mobile
        │   ├── useFlowchartModel.ts    # v-model store, immutable commits, history
        │   ├── useFlowchartI18n.ts     # i18n message maps (zh-CN / en-US)
        │   ├── useCanvasPanZoom.ts      # Pan/zoom math, wheel handling, screen<->world
        │   ├── useEdgeDrawing.ts        # Connection drag state machine
        │   ├── useSelection.ts          # Selection state
        │   ├── useDragFromSidebar.ts    # Sidebar node drag-create
        │   └── useKeyboard.ts           # Keyboard shortcuts
        ├── style/
        │   └── theme.css                # CSS custom properties (60+ --fc-* vars)
        └── utils/
            ├── anchorUtils.ts          # Anchor point geometry
            ├── geometry.ts             # Snap-to-grid and point math
            ├── colorUtils.ts           # Preset palettes + contrast calculation
            └── idGenerator.ts          # Id generation (nanoid)
```

### Design Principles

- **Single source of truth (`v-model`)**: `useFlowchartModel` owns the data. Every mutation produces a new immutable `FlowchartData` and emits `update:modelValue`, so the parent always holds the canonical state.
- **SVG with a single world-space transform**: One `<g transform="translate(panX, panY) scale(zoom)">` contains all diagram content (nodes, edges, free lines, handles). Panning and zooming only update this transform, never per-element positions.
- **Smart orthogonal routing**: Edges avoid the source and target nodes themselves and detour around third-party nodes; complex cases fall back to a grid-based Dijkstra search.
- **Theme via CSS variables**: 60+ `--fc-*` custom properties are injected through `provide`/`inject`; switching the `theme` prop re-skins the whole component.
- **i18n via `provide`/`inject`**: Built-in `zh-CN` and `en-US` maps, switched by the `locale` prop.
- **Composition API with single-responsibility composables**: Each concern (model, selection, pan/zoom, edge drawing, keyboard) lives in its own composable sharing a small context.
- **Undo / redo**: Full `FlowchartData` snapshots (up to 50 steps) drive history.
- **Snap-to-grid**: The grid size adapts to the current zoom level for comfortable editing.

---

## Keyboard Shortcuts

### Editing

| Keys | Action |
|------|--------|
| `Double-click` / `Enter` | Enter inline text edit on the selected node |
| `Escape` | Cancel editing, drawing, or current selection |
| `Delete` / `Backspace` | Remove the selected node, edge, or free line |

### Clipboard and History

| Keys | Action |
|------|--------|
| `Ctrl/Cmd+C` | Copy the selection (node / edge / free line) |
| `Ctrl/Cmd+X` | Cut the selection |
| `Ctrl/Cmd+V` | Paste (internal clipboard, or external plain text as a text node) |
| `Ctrl/Cmd+Z` | Undo |
| `Ctrl/Cmd+Y` / `Ctrl/Cmd+Shift+Z` | Redo |

### Canvas and Selection

| Keys | Action |
|------|--------|
| `Arrow keys` | Nudge the selected node (1 grid step) |
| `Shift + Arrow keys` | Nudge the selected node faster (4x grid step) |
| `Mouse wheel` | Zoom in / out at the cursor |
| `Right / Middle drag` | Pan the canvas |

---

## Edge Routing Algorithm

The edge router builds an orthogonal (right-angle) polyline between two node anchors.

- **Basic path construction**: Automatically selects an L-shaped, Z-shaped, or U-shaped polyline based on the source and target anchor directions.
- **Node self-avoidance**: Paths automatically avoid the source and target nodes themselves during generation.
- **Third-party node detour**: Detects when a path would pass through other nodes and generates detour polylines.
- **Grid-based path search**: For complex scenarios, it builds a grid graph and uses a Dijkstra shortest-path search with turn penalties.
- **Path cleaning**: Automatically merges collinear segments and removes duplicate consecutive points.
- **Rounded corners**: `buildRoundedPath` produces smooth rounded corners (default `cornerRadius` is 8).

---

## Theming

### CSS Variable Injection

Theme colors are injected as CSS custom properties prefixed with `--fc-`:

```css
--fc-bg, --fc-grid-bg, --fc-grid-line, --fc-selection-bg,
--fc-node-fill, --fc-node-border, --fc-node-text,
--fc-edge-stroke, --fc-sidebar-bg, --fc-sidebar-border,
--fc-bar-bg, --fc-toolbar-bg,
/* ... and many more */
```

### Custom Theme

Pass `theme="dark"` for dark mode, or wrap the component and override CSS variables for full customization:

```vue
<template>
  <div style="--fc-bg: #1a1a2e; --fc-node-text: #e0e0e0;">
    <FlowchartContainer v-model="data" theme="dark" />
  </div>
</template>
```

### Internationalization

Built-in languages: `'zh-CN'` and `'en-US'`. Pass the `locale` prop to switch; toolbar labels, tooltips, and context menus are automatically localized.

---

## Building

```bash
# Type-check only
pnpm typecheck

# Production library build (type-check + vite build + d.ts emit)
pnpm build

# Demo build (normal app build into dist-demo)
pnpm build:demo

# Preview the production build
pnpm preview
```

### Build Output

| File | Description |
|------|-------------|
| `dist/xiaodao-flowchart.es.js` | ES module (for bundlers) |
| `dist/xiaodao-flowchart.umd.cjs` | UMD bundle (for direct `<script>` usage) |
| `dist/xiaodao-flowchart.css` | Extracted stylesheet |
| `dist/types/` | TypeScript declaration files |

The `build:demo` script emits a standalone demo app into `dist-demo/`, which is git-ignored (like `dist/`).

### CI/CD

The project includes a GitHub Actions workflow (`.github/workflows/publish.yml`) for automated publishing to npm.

---

## Roadmap

### Near-term

- [x] 5 node types (rectangle, diamond, ellipse, parallelogram, text)
- [x] Smart orthogonal edge routing with node avoidance and detour
- [x] Free lines and draggable edge re-routing
- [x] Undo / redo and cut / copy / paste
- [x] Light / dark themes and i18n (zh-CN, en-US)
- [ ] Export to PNG / SVG
- [ ] Minimap / overview navigation

### Mid-term

- [ ] Multi-selection and group move
- [ ] Alignment guides and smart snapping
- [ ] Edge labels with rich positioning
- [ ] Subgraph / container nodes

### Long-term

- [ ] Plugin system for custom node renderers
- [ ] Collaborative editing

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Vue 3 (Composition API + `<script setup>`) | `^3.3` (peer), `^3.5` (dev) |
| Build | Vite | `^8` |
| Language | TypeScript (strict) | `~6` |
| Type Checker | vue-tsc | `^3` |
| Rendering | SVG 2D (single world-space transform) | - |
| Package Manager | pnpm / npm | - |
| CSS | Scoped CSS + CSS Custom Properties | - |

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
