# xiaodao-flowchart: Design Document

[中文](./DOC.ZH.md) | **English**

A Vue 3 flowchart component rendered with SVG. It provides an Excel-like node/edge editing surface: drag nodes from a sidebar, draw orthogonal connectors between anchors, sketch free lines, resize and recolor, pan and zoom, undo and redo, and two-way bind the whole diagram through `v-model`.

> README (user-facing docs) is at [README.md](./README.md). The Chinese version of this document is [DOC.ZH.md](./DOC.ZH.md).

---

## 1. Tech Stack

| Layer | Choice | Version |
|---|---|---|
| Framework | Vue 3 (Composition API + `<script setup>`) | ^3.3 |
| Build | Vite | ^5.0 |
| Language | TypeScript (strict) | ~5.4 |
| Rendering | SVG 2 (single world-space transform group) | - |
| Type Checker | vue-tsc | ^2.0 |
| Package Manager | pnpm | - |
| Runtime dep | nanoid (id generation, externalized in library build) | ^5.0 |

---

## 2. File Structure

```text
src/
├── main.ts                         # createApp(App).mount('#app')
├── App.vue                         # Demo application (sets document.title, mounts FlowchartContainer)
├── index.ts                        # Library entry re-export
└── components/flowchart/
    ├── index.ts                    # Barrel: FlowchartContainer + all type exports
    ├── FlowchartContainer.vue      # Orchestration / controller (model, selection, history, clipboard, keyboard)
    ├── FlowchartCanvas.vue         # SVG canvas + single pointer state machine
    ├── FlowchartNode.vue           # Node shape + foreignObject label + anchors + resize handles
    ├── FlowchartEdge.vue           # Orthogonal edge rendering (routed path + arrow marker)
    ├── NodeSidebar.vue             # Templates + tool toggles (drag source)
    ├── AnchorPoints.vue            # 4 connection dots per node
    ├── ResizeHandles.vue           # 8 resize handles per selected node
    ├── TextNodeEditor.vue          # Inline label editor (HTML textarea overlay)
    ├── NodeActionBar.vue           # Color picker bar for the selected node
    ├── EdgeActionBar.vue           # Color picker bar for the selected edge / free line
    ├── style/
    │   └── theme.css               # CSS variable theme blocks (light + dark)
    ├── composables/
    │   ├── useFlowchartContext.ts  # provide/inject keys + theme/locale/mobile
    │   ├── useFlowchartI18n.ts     # messages map + createI18n()
    │   ├── useFlowchartModel.ts    # v-model + immutable commit + CRUD operations
    │   ├── useSelection.ts         # selection state (node / edge / free line)
    │   ├── useCanvasPanZoom.ts     # viewport (panX/panY/zoom) + cursor-anchored wheel zoom
    │   ├── useEdgeDrawing.ts       # edge drawing state machine
    │   ├── useDragFromSidebar.ts   # sidebar drag/drop node templates
    │   ├── useNodeDrag.ts          # node drag helper (available)
    │   ├── useNodeResize.ts        # node resize helper (available)
    │   └── useKeyboard.ts          # keyboard shortcut registration
    ├── types/
    │   └── index.ts                # All type definitions + shared constants
    └── utils/
        ├── anchorUtils.ts         # anchor point math (display + logical)
        ├── colorUtils.ts          # preset palette + contrastColor()
        ├── edgeRouting.ts         # orthogonal routing engine (waypoints + Dijkstra)
        ├── geometry.ts            # snapToGrid / clamp / midpoint
        └── idGenerator.ts         # nanoid wrapper
```

**Dependency Direction**: `App.vue → index.ts → FlowchartContainer → FlowchartCanvas + child components`, with `composables/*` and `utils/*` sitting below the components. `FlowchartCanvas` is a "dumb" renderer: it never mutates the data model, it only emits semantic pointer events that `FlowchartContainer` translates into model calls.

---

## 3. Type System

All type definitions live in `types/index.ts`.

```typescript
// Node category
type NodeType = 'rectangle' | 'diamond' | 'ellipse' | 'parallelogram' | 'text';

// Visual theme and locale
type Theme = 'light' | 'dark';
type Locale = 'zh-CN' | 'en-US';

// Connection anchor on a node (4 sides)
type AnchorPosition = 'top' | 'right' | 'bottom' | 'left';

// Resize handle ids (8 handles)
type ResizeHandleId
  = | 'top-left' | 'top-center' | 'top-right'
    | 'middle-left' | 'middle-right'
    | 'bottom-left' | 'bottom-center' | 'bottom-right';

// Node visual style (all fields optional; absent fields use theme defaults)
interface NodeStyle {
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  textColor?: string;
  fontSize?: number;
  borderRadius?: number;
  opacity?: number;
}

// Edge visual style
interface EdgeStyle {
  strokeColor?: string;
  strokeWidth?: number;
  cornerRadius?: number;   // overrides the default rounded-corner radius
}

// Free line (annotation stroke) visual style
interface FreeLineStyle {
  strokeColor?: string;
  strokeWidth?: number;
}

// A single node
interface FlowchartNode {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  style?: NodeStyle;
}

// A single edge between two node anchors
interface FlowchartEdge {
  id: string;
  sourceNodeId: string;
  sourceAnchor: AnchorPosition;
  targetNodeId: string;
  targetAnchor: AnchorPosition;
  label?: string;
  style?: EdgeStyle;
}

// A free annotation line (not attached to nodes)
interface FreeLine {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  style?: FreeLineStyle;
}

// Top-level diagram document (the v-model payload)
interface FlowchartData {
  nodes: FlowchartNode[];
  edges: FlowchartEdge[];
  freeLines?: FreeLine[];
}

// Sidebar template descriptor
interface SidebarNodeTemplate {
  type: NodeType;
  label: string;
  defaultWidth: number;
  defaultHeight: number;
}

// Camera state
interface CanvasViewport {
  panX: number;
  panY: number;
  zoom: number;
}

// Selection snapshot
interface SelectionState {
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
}

// In-progress edge drawing state
interface EdgeDrawingState {
  active: boolean;
  sourceNodeId: string;
  sourceAnchor: AnchorPosition;
  currentMouseX: number;
  currentMouseY: number;
}

// In-progress resize drag state (helper)
interface ResizeDragState {
  active: boolean;
  nodeId: string;
  handle: ResizeHandleId;
  startPointerX: number;
  startPointerY: number;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
}

// Shared constants
const DEFAULT_NODE_STYLE: Required<NodeStyle>;     // white bg, #333 border, 2px, black text, 14px, radius 4, opacity 1
const DEFAULT_EDGE_STYLE: Required<EdgeStyle>;     // #555 stroke, 2px, cornerRadius 8
const DEFAULT_FREE_LINE_STYLE: Required<FreeLineStyle>; // #555 stroke, 2px
const MIN_NODE_WIDTH = 40;
const MIN_NODE_HEIGHT = 30;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 10.0;
const ZOOM_STEP = 1.08;
const GRID_SIZE = 15;
const BASE_GRID_SIZE = 15;
```

---

## 4. Data Model

### 4.1 Core State

| State | Type | Owner | Description |
|---|---|---|---|
| `internalData` | `ref<FlowchartData>` | `useFlowchartModel` | Deep clone of the incoming `modelValue`; the single source of truth for rendering |
| `viewport` | `ref<CanvasViewport>` | `useCanvasPanZoom` | `{ panX, panY, zoom }`; the camera. Updated by wheel, toolbar buttons, drag |
| `selection` | `{ selectedNodeId, selectedEdgeId, selectedFreeLineId }` | `useSelection` | Current selection (only one kind is active at a time) |
| `drawingState` | `ref<EdgeDrawingState \| null>` | `useEdgeDrawing` | In-progress edge being drawn from an anchor |
| `editingNodeId` | `ref<string \| null>` | `FlowchartContainer` | Node whose label is being edited inline |
| `history` | `ref<FlowchartData[]>` | `FlowchartContainer` | Snapshot stack for undo/redo (max 50) |
| `historyIndex` | `ref<number>` | `FlowchartContainer` | Pointer into `history`; entries after it are redo-able |
| `internalClipboard` | `ref<FlowchartData \| null>` | `FlowchartContainer` | Copy/cut buffer for internal paste |
| `lineToolActive` | `ref<boolean>` | `FlowchartContainer` | Free-line drawing tool toggle (Shift+click also triggers it) |
| `selectedNodeTool` | `ref<NodeType \| null>` | `FlowchartContainer` | Active node tool from the sidebar (click-drag to place) |

### 4.2 v-model Data Sync

`FlowchartContainer` builds the model once:

```typescript
const model = useFlowchartModel(modelValueRef, (value) => emit('update:modelValue', value));
```

`useFlowchartModel` keeps `internalData` as a deep clone of the prop and exposes CRUD operations (`addNode`, `updateNode`, `removeNode`, `addEdge`, `removeEdge`, `moveNode`, `setNodePosition`, `resizeNode`, `updateNodeLabel`, `updateNodeStyle`, `addFreeLine`, …). Every operation follows the same immutable pattern:

```typescript
function commit(newData: FlowchartData) {
  internalData.value = newData;                       // replace reference (reactive trigger)
  emit('update:modelValue', deepClone(newData));      // hand the parent a fresh copy
}

function addNode(/* ... */): string {
  const newData = deepClone(internalData.value);
  newData.nodes.push(newNode);
  commit(newData);                                    // parent gets a new object, never the internal one
  return newNode.id;
}
```

Consequences:

- The parent's `FlowchartData` is never mutated in place.
- External changes to `modelValue` are observed by a `watch` inside the model (`{ deep: true }`) and synced back into `internalData`, so two-way binding works in both directions.
- Because the payload is a plain JSON-serializable object, persistence is trivial: `JSON.stringify(data.value)` round-trips with no proprietary format.

---

## 5. Layout Constants & Coordinate System

```text
GRID_SIZE        = 15    (base grid pitch in world units)
BASE_GRID_SIZE   = 15    (same value, used by the canvas grid math)
MIN_NODE_WIDTH   = 40
MIN_NODE_HEIGHT  = 30
MIN_ZOOM         = 0.1
MAX_ZOOM         = 10.0
ZOOM_STEP        = 1.08  (per wheel notch / toolbar click)
EXIT_MARGIN      = 40    (edge routing: how far a connector exits a node before turning)
NODE_PADDING     = 15    (edge routing: obstacle inflation around a node)
BEND_PENALTY     = 20    (edge routing: cost added per turn in the grid search)
MAX_AVOIDANCE_PASSES = 80 (edge routing: max local detour iterations)
```

### 5.1 Two coordinate spaces

- **Screen space**: CSS pixels relative to the SVG wrapper (`event.clientX/Y` minus the bounding rect).
- **World space**: diagram coordinates stored in `FlowchartData` (node `x/y`, anchor points, edge waypoints).

All pointer input is converted to world space immediately so positions, anchors, and snapping are zoom-independent:

```typescript
worldX = (screenX - rect.left - viewport.panX) / viewport.zoom
worldY = (screenY - rect.top  - viewport.panY) / viewport.zoom
```

This is `useCanvasPanZoom.screenToCanvas` and the local `sc()` helper in `FlowchartCanvas`.

### 5.2 Adaptive grid

The grid pitch is kept visually stable across zoom levels. The canvas computes a `gridLevel` (8 at `zoom <= 0.1`, 4 at `<= 0.25`, 2 at `<= 0.5`, else 1) and derives:

```text
gridScreenPx = BASE * gridLevel * zoom     // dot spacing in screen pixels
snapSize     = zoom >= 10 ? 1.5
             : zoom >= 5  ? 3
             : zoom >= 2  ? 7.5
             : 15 * gridLevel                  // world units to snap node coordinates to
```

Sub-grids (`sub2`, `sub5`, `sub10`) fade in at `zoom >= 2 / 5 / 10` so dense grids stay legible. Snapping uses `geometry.snapToGrid(value, snapSize)`.

---

## 6. Rendering Pipeline

### 6.1 One SVG, one world-space group

`FlowchartCanvas` renders a single `<svg>` that fills its wrapper. Inside it:

- **Screen-space grid.** `<pattern>` definitions (dot grid) are painted as full-size `<rect>`s *outside* the transform group, so the grid stays aligned to the screen and scales with zoom via `gridScreenPx = BASE * level * zoom`. Pan offset is applied through the pattern `x`/`y` attributes.
- **World-space content.** A single `<g :transform="translate(panX, panY) scale(zoom)">` contains everything that lives in diagram coordinates: edges, free lines, the in-progress drawing, nodes, and handles. Panning and zooming are achieved purely by updating this transform, with no per-element recomputation.

Because it is SVG (not Canvas 2D), there is no DPR scaling step and no manual `requestAnimationFrame` redraw loop: Vue's reactivity re-renders the affected DOM nodes directly. The "rendering pipeline" is therefore declarative, not imperative.

### 6.2 Draw order (inside the transform group)

1. `edges-layer`: `FlowchartEdge` components (routed path + arrow marker), then free lines (`<line>` with a wider transparent hit area + visible stroke + endpoint handles when selected).
2. `drawing-layer`: the in-progress edge preview (dashed path + arrowhead) while `drawingState.active`.
3. `nodes-layer`: `FlowchartNode` components (shape + `foreignObject` label + `AnchorPoints` + `ResizeHandles` when selected).
4. `edge-handles-layer`: source/target endpoint handles for the selected edge (drag to reroute).
5. free-line draw preview and node-tool preview overlays.

`TextNodeEditor` is rendered as an HTML overlay *outside* the `<svg>` (absolutely positioned), driven by `editingInfo` so it stays aligned with the node under the world transform.

### 6.3 Arrowheads

Arrowheads use a **per-color `<marker>`** defined in the canvas `<defs>` (one marker per distinct stroke color). This avoids the `fill="context-stroke"` limitation on iOS Safari. `FlowchartEdge` references `url(#arrowhead-<hex>)` so each edge gets a correctly colored head.

---

## 7. Edge Routing Engine

The routing engine (`utils/edgeRouting.ts`) turns a source anchor and a target anchor into a smooth orthogonal polyline that avoids overlapping nodes. Two public functions drive it:

```typescript
computeOrthogonalWaypoints(
  source: Point, sourceAnchor: AnchorPosition,
  target: Point, targetAnchor: AnchorPosition,
  allNodes?: NodeRect[], excludeNodeIds?: string[],
  sourceRect?: Rect, targetRect?: Rect,
): Point[]

buildRoundedPath(points: Point[], cornerRadius: number): string   // returns an SVG `d` string
```

`NodeRect` (id + type + x/y/width/height) is the minimal shape the engine needs; `FlowchartEdge` passes `allNodes` (excluding the two endpoints) so routing can avoid third-party nodes.

### 7.1 Anchor directions

Each `AnchorPosition` maps to an outward direction vector (`anchorUtils.getDirectionVector`): `top → (0,-1)`, `right → (1,0)`, `bottom → (0,1)`, `left → (-1,0)`.

### 7.2 Base shape selection

`buildSafeWaypoints` first tries the cheapest path:

- Opposite anchors that are perfectly aligned (e.g. right to left on the same row) become a straight line.
- Otherwise it exits straight out of the source anchor (`EXIT_MARGIN` units) and enters straight into the target anchor, then connects with an L, Z, or U shaped skeleton chosen by the relative anchor orientation (`sameSide`, `bothH`, `bothV`, `hToV`, `vToH`).
- For each candidate corner it tests `cornerSafe`: the two sub-segments must not touch either node body. If the direct corner is blocked it tries the alternate corner, then extends past the node and crosses on the perpendicular axis via `safeCrossCoord`.

### 7.3 Obstacle avoidance

When `allNodes` is supplied, `avoidThirdPartyNodes` runs after the base skeleton:

1. It skips routing when `findFirstBlockedSegment` finds no blocked segment.
2. Otherwise it first tries a global detour `routeAroundAllNodes`, which builds a **grid graph** over the bounding region (see 7.4) and runs a shortest-path search.
3. If the global route fails, it falls back to a local, iterative approach: up to `MAX_AVOIDANCE_PASSES` (80) passes, each finds the first blocked segment and wraps that single node via `routeAroundNode` (go around top/bottom or left/right depending on travel direction), then `cleanPath` merges collinear points.

Text nodes (`type === 'text'`) are excluded from obstacles, so connectors can pass over annotation text.

### 7.4 Grid graph + Dijkstra

For hard cases, `findGridRoute` builds an orthogonal grid graph:

- It collects every relevant x and y coordinate: the endpoints, the base waypoints, and the padded bounds (`NODE_PADDING` inflation) of every obstacle node, then sorts them uniquely.
- It keeps only grid points that are not inside any padded node (`pointBlocked`) and connects adjacent colinear points whose segment is clear (`segmentClear`) with an edge cost equal to the Manhattan distance.
- `runShortestPath` runs a uniform-cost (Dijkstra) search where each state also tracks the incoming direction. A **turn penalty** (`BEND_PENALTY = 20`) is added when the direction changes, so the engine prefers paths with fewer bends. The search can require the final segment to enter the target on the correct axis (`endDir`).

### 7.5 Path cleaning and rounding

- `cleanPath` removes duplicate consecutive points and collapses three or more collinear points into a single turn, keeping the polyline minimal.
- `buildRoundedPath` emits the final SVG `d` string. The default `cornerRadius` is `8` (from `DEFAULT_EDGE_STYLE`), overridable per edge via `EdgeStyle.cornerRadius`.

The routing result is a pure `Point[]`, so callers only ever consume the resulting `d` string. Custom routing can replace `computeOrthogonalWaypoints` / `buildRoundedPath` without touching the rest of the stack.

---

## 8. Interaction Model

### 8.1 Unified pointer state machine

All pointer interaction in `FlowchartCanvas` is driven by a single `DragState` discriminated union:

```typescript
type DragState
  = | { type: 'none' }
    | { type: 'clickPending'; nodeId; startPX; startPY }
    | { type: 'node'; nodeId; startNX; startNY; startPX; startPY }
    | { type: 'resize'; nodeId; handle; pnx; pny; nx; ny; nw; nh }
    | { type: 'drawing'; sourceNodeId; sourceAnchor }
    | { type: 'pan'; startPX; startPY; startPanX; startPanY }
    | { type: 'edgeHandle'; edgeId; handle; startPX; startPY }
    | { type: 'freeLine'; startX; startY }
    | { type: 'nodeTool'; nodeType; startX; startY; startPX; startPY }
    | { type: 'freeLineEndpoint'; freeLineId; handle; ... }
    | { type: 'freeLineMove'; freeLineId; ... }
```

`onPointerDown` inspects `event.target` (via `closest('[data-…]')` attributes) to decide the drag kind; `onPointerMove` advances it; `onPointerUp` / `onPointerCancel` finalize or abort. Using one state variable (instead of many booleans) makes the transition logic easy to reason about and avoids conflicting gestures.

### 8.2 Hit-testing strategy

Rather than hit-testing raw coordinates, the canvas relies on SVG element attributes:

- `[data-node-id]`, `[data-anchor]`, `[data-handle-id]` for nodes / anchors / resize handles.
- `[data-edge-id]`, `[data-edge-handle]` for edges and their endpoints.
- `[data-freeline-id]`, `[data-freeline-handle]` for free lines.

This keeps geometry out of the event handlers and leverages the browser's own hit-testing. Hover highlight for edge reroute and edge drawing uses a proximity test (`findAnchorNearPoint`, radius ~20 to 25 world units).

### 8.3 Mouse

| Operation | Behavior |
|---|---|
| Click node | Select node (emit `nodeSelect`) |
| Drag node | Move node (snapped to grid) |
| Double-click node | Enter inline label editing |
| Click edge | Select edge (emit `edgeSelect`) |
| Drag edge endpoint handle | Reroute edge to a nearby anchor |
| Drag empty canvas | Pan |
| Middle-button drag | Pan |
| Wheel | Cursor-anchored zoom |
| Click free line | Select free line |
| Drag free line endpoint / body | Move endpoint / whole line |
| Shift+click or Line tool on empty canvas | Draw a free line |
| Click node tool on empty canvas | Drag to size a new node |
| Right-click | Prevented (no context menu) |

### 8.4 Keyboard

See [Section 12](#12-undo-redo) for undo/redo keys. The rest:

| Key | Behavior |
|---|---|
| `Delete` / `Backspace` | Delete selection (ignored while editing a label) |
| `Escape` | Cancel drawing, clear tools, clear selection, exit edit |
| Arrow keys | Nudge selected node by one grid step (`Shift` = 4x) |
| `Ctrl/Cmd + X` | Cut selection |
| `Ctrl/Cmd + C` | Copy selection |
| `Ctrl/Cmd + V` | Paste (internal buffer, else system-clipboard text as a text node) |

`useKeyboard` attaches a `window` `keydown` listener and removes it on unmount. `Ctrl/Cmd + Z` / `Shift + Z` / `Y` for undo/redo and `Ctrl/Cmd + X/C` are handled by a second `window` listener in `FlowchartContainer` to coexist with the edit overlay.

### 8.5 Touch

The component is touch-capable through Pointer Events: `onPointerDown/Move/Up` already unify mouse and touch. `touch-action: none` on the wrapper and SVG prevents the browser from hijacking pan/zoom gestures, so a single finger pans the canvas and a drag on a node moves it. Pinch-zoom is not yet implemented (wheel zoom is the only zoom path).

### 8.6 Context menus

There is no context menu in the current build; right-click is suppressed (`@contextmenu.prevent`) to keep the canvas from showing the browser menu.

---

## 9. Clipboard Protocol

- **Copy / Cut**: `copySelection` snapshots the selected node (with its `style`), edge (with `style`), or free line into `internalClipboard` as a minimal `FlowchartData`. `cutSelection` copies then deletes.
- **Paste (internal)**: `pasteClipboard` regenerates IDs via `idGenerator.generateId`, remaps edge endpoints to the new node ids, and offsets every pasted item by `PASTE_OFFSET (30) * pasteCounter` so repeated pastes stack diagonally. It emits a fresh `FlowchartData`.
- **Paste (external)**: a `window` `paste` listener handles `Ctrl/Cmd + V`. If `internalClipboard` is empty and the system clipboard holds plain text, the text becomes a new `text` node placed at the center of the current viewport (labels longer than 100 chars are truncated).
- **Sidebar drag**: node templates can also be dragged from `NodeSidebar` and dropped on the canvas (`@drop`), which creates a node at the dropped world coordinate.

---

## 10. Theme System

Theming is **data-attribute + CSS-variable** based, not prop-driven per element.

- `FlowchartContainer` computes `resolvedTheme` and adds the `theme-dark` class to the root `.flowchart-container` when dark.
- `style/theme.css` defines two variable blocks: `.flowchart-container { --fc-*: … }` (light) and `.flowchart-container.theme-dark { --fc-*: … }` (dark). There are 60+ variables spanning canvas, grid, sidebar, action bars, editor, nodes, edges, and text nodes.
- Child components reference only `var(--fc-*)`. A few SVG-only values that CSS variables cannot express (grid dot colors, arrow marker fills) are computed in script from `currentTheme` (read through `useFlowchartContext`).

### 10.1 Color palette

`utils/colorUtils.ts` holds the preset palette:

- **Node palette**: 18 preset colors (`PRESET_COLOR_NAMES`), from White and Light Pink through the Light* family to Red/Blue/Green/Orange/Purple/Cyan/Brown and the Dark* variants.
- **Edge palette**: 15 edge colors (`EDGE_COLOR_NAMES`).
- `contrastColor(bg)` returns `#000` or `#fff` so node labels stay readable on any background fill.

To customize, a consumer overrides variables in their own stylesheet loaded after `xiaodao-flowchart/style.css`. The default node fill is `DEFAULT_COLOR` (`#FFFFFF`) and the default edge stroke is `EDGE_DEFAULT_COLOR` (`#555555`); choosing those in a color picker clears the explicit `backgroundColor` / `strokeColor` so theme defaults take over.

### 10.2 Dependency injection

`useFlowchartContext` exposes `theme`, `locale`, and `mobile` to every descendant via Vue `provide`/`inject` (`themeKey`, `localeKey`, `mobileKey`). Components call `useFlowchartContext()` and read `computed` values with safe defaults, so they work even when used outside the full container (for example in unit tests).

---

## 11. Responsive Adaptation

`FlowchartContainer` accepts `width` / `height` props (number pixel or CSS string). When omitted, the root uses `width: 100%` and `height: 100vh`, and `canvas-area` is `flex: 1` so the SVG always fills its parent. Because the SVG is `width: 100%; height: 100%`, the viewport size is read from `canvasAreaRef.clientWidth/Height` at mount and on every `resetView`. There is no `ResizeObserver` in the current build; resizing the host is handled by the flex layout and the next reset/zoom interaction.

---

## 12. Undo / Redo

`FlowchartContainer` maintains an in-component history:

```typescript
const MAX_HISTORY = 50
const history = ref<FlowchartData[]>([])
const historyIndex = ref(-1)
```

- A `watch(modelValue, …, { immediate: true, deep: true })` pushes a deep-cloned snapshot whenever the data changes from **outside** the undo/redo actions.
- `undo()` / `redo()` set `suppressHistory = true` before emitting the restored snapshot, so the subsequent `watch` does not re-record the jump.
- Redo entries ahead of the current index are discarded when a new edit is made (`history = history.slice(0, historyIndex + 1)`).
- `pushHistory` trims the oldest snapshot when `history.length > MAX_HISTORY`.

Keyboard: `Ctrl/Cmd + Z` undoes, `Ctrl/Cmd + Shift + Z` or `Ctrl/Cmd + Y` redoes.

---

## 13. Extension Points / Roadmap

### 13.1 Nodes and shapes

- **New node shape**: add the type to `NodeType`, render it in `FlowchartNode.vue`, and (optionally) add a sidebar template in `useDragFromSidebar` / `NodeSidebar.vue`.
- **New sidebar template**: extend `SidebarNodeTemplate[]` returned by `useDragFromSidebar`.

### 13.2 Edges

- **Custom routing**: replace `computeOrthogonalWaypoints` / `buildRoundedPath` in `utils/edgeRouting.ts`; the rest of the stack consumes only the resulting `d` string.
- **Per-edge style**: `strokeColor`, `strokeWidth`, and `cornerRadius` are already per-edge overridable.

### 13.3 Interaction

- **Pinch-zoom**: add a touch pinch handler alongside `useCanvasPanZoom.handleWheel`.
- **Context menus**: wire `@contextmenu` (currently suppressed) to a menu component.
- **Multi-select**: `useSelection` currently holds a single node / edge / free line; extend it for range or box selection.

### 13.4 Theming and i18n

- **New language**: extend `messages` and the `I18nKey` union in `useFlowchartI18n.ts`.
- **Custom theme**: override `--fc-*` variables after importing the stylesheet.

### 13.5 Roadmap

| Phase | Item | Status |
|---|---|---|
| Near | More node shapes (rounded, hexagon, etc.) | - |
| Near | Multi-select and box selection | - |
| Near | Context menus (node / edge / canvas) | - |
| Mid | Pinch-zoom on touch | - |
| Mid | Snap-to-node and alignment guides | - |
| Mid | Export to SVG / PNG | - |
| Mid | Minimap | - |
| Long | Collaborative editing (CRDT / shared doc) | - |
| Long | Web-worker routing for very large diagrams | - |

---

## 14. Development Notes

1. **Immutable commits.** Every edit deep-clones the whole `FlowchartData` and emits a fresh object. This is simple and correct but allocates a full copy per keystroke/drag frame; for very large diagrams a patch-based or structural-sharing model could reduce GC pressure.
2. **Single decision-maker.** `FlowchartCanvas` emits semantic events; `FlowchartContainer` is the only place that calls model mutations. Keep it that way when adding features.
3. **World-space first.** Convert every pointer coordinate to world space at the boundary (`sc()` / `screenToCanvas`) so snapping, anchors, and routing never depend on zoom.
4. **Hit-testing via attributes.** Prefer `data-*` attributes and `closest()` over manual geometry in the event handlers.
5. **Cross-platform keys.** Undo/redo/cut/copy use `e.metaKey || e.ctrlKey` for Mac compatibility.
6. **Strict TypeScript.** All function parameters and returns are typed; `vue-tsc --noEmit` runs before the library build.
7. **Theme through variables.** Add new visual concepts as `--fc-*` variables; compute only SVG-only values (grid dots, markers) in script.

---

## 15. Node Rendering

`FlowchartNode` draws the shape as a native SVG primitive (`<rect>`, `<polygon>`, or `<ellipse>`) and renders the **label inside a `<foreignObject>`** containing an HTML `<div>`. The `foreignObject` is what enables proper text wrapping (`word-break`, `white-space: pre-wrap`) and vertical centering that pure SVG `<text>` cannot do cleanly.

- Default fill is theme-derived (`DEFAULT_COLOR = #fff` in light, the dark default in `theme-dark`) when `style.backgroundColor` is absent. `FlowchartContainer.onPickNodeColor` clears `backgroundColor` / `textColor` when the default is chosen so the theme value resumes.
- Text color is computed with `contrastColor(bg)` so labels stay readable on any background.
- `AnchorPoints` (4 connection dots) and `ResizeHandles` (8 handles, when selected) are rendered as child SVG groups; their pointer targets carry `data-*` attributes used by the canvas hit-testing.
- `parallelogram` uses a skew of `min(15, w * 0.15)`; `diamond` is the polygon `(cx,top) (right,cy) (cx,bottom) (left,cy)`.

---

## 16. Anchors and Edge Reroute

Each node exposes 4 anchors (`top`, `right`, `bottom`, `left`). `AnchorPoints` renders them as small dots; `getAnchorDisplayPoint` gives their on-screen position (in world space, inside the transform group) for hit-testing.

- **Drawing a new edge**: pressing an anchor starts `useEdgeDrawing` (`drawingState.active`); `onPointerMove` updates the cursor world position and `FlowchartCanvas` shows a dashed preview routed from the source anchor to the mouse; releasing over a nearby target anchor calls `model.addEdge`, which rejects self-loops and duplicate edges. Releasing on empty space cancels.
- **Rerouting an existing edge**: selecting an edge shows its two endpoint handles (`edge-handles-layer`). Dragging a handle enters `drag.type === 'edgeHandle'`; `onPointerMove` shows a dashed preview and tracks the nearest anchor (`hoveredNodeId` / `hoveredAnchor`, radius ~25), and `onPointerUp` emits `edgeReroute`, which rewires that endpoint to the new node/anchor (never to the other endpoint of the same edge).
- Free lines have no anchors; they are moved by dragging an endpoint handle or the line body.

---

## 17. Free Lines

Free lines (`FreeLine`) are annotation strokes not bound to nodes. They are created by the Line tool (`lineToolActive`) or Shift+click drag on empty canvas, or by dragging the Line template from the sidebar. `FlowchartCanvas` renders each as a transparent wide `<line>` (hit area) plus the visible stroke, and shows two endpoint handles when selected. Moving an endpoint or the body emits `freeLineMove`, which `FlowchartContainer` maps to `model.moveFreeLine`. Style (`strokeColor`, `strokeWidth`) is edited through `EdgeActionBar` (shared with edges). Free lines live in `FlowchartData.freeLines` and are included in v-model, copy/paste, and undo/redo.

---

## 18. Pan and Zoom

`useCanvasPanZoom` owns the `viewport` (`{ panX, panY, zoom }`).

- **Wheel zoom is cursor-anchored**: `handleWheel` keeps the world point under the cursor fixed by adjusting `panX/panY` proportionally to the zoom ratio (`scale = newZoom / zoom`). Zoom is clamped to `[MIN_ZOOM=0.1, MAX_ZOOM=10]`.
- **Toolbar zoom**: `zoomAtCenter` zooms around the viewport center (used by the zoom-in / zoom-out buttons) with the same `ZOOM_STEP = 1.08`.
- **Reset view**: `resetView` centers the bounding box of all nodes at `zoom = 1`.
- **Pan clamp**: `applyPanClamp` prevents the content from being panned fully off-screen when it is larger than the viewport (padding `EDGE_PAD = 100`). It runs after wheel zoom, center zoom, and on reset.
- **Drag pan**: `drag.type === 'pan'` (empty-canvas drag or middle button) emits `panMove`, which writes `viewport.panX/panY` directly.

All transforms go through the single `<g transform="translate(panX, panY) scale(zoom)">`, so nodes, edges, free lines, handles, and the text editor overlay stay perfectly aligned at every zoom level.
