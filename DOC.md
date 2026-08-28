# xiaodao-flowchart — Architecture Design

This document describes the internal architecture of the `xiaodao-flowchart` component: how the layers are organized, how data flows, how rendering and interaction work, and how the major subsystems (routing, theming, i18n, history) are implemented. It is intended for contributors and for anyone who wants to extend or embed the component.

> README (user-facing docs) is at [README.md](./README.md). The Chinese version of this document is [DOC.ZH.md](./DOC.ZH.md).

---

## 1. Design Goals

1. **Single source of truth.** All diagram state lives in one `FlowchartData` object owned by the parent via `v-model`. The component never mutates the parent's object in place; it emits a new copy on every change.
2. **Unidirectional, predictable updates.** Every mutation funnels through one model layer (`useFlowchartModel`) which produces an immutable snapshot and emits `update:modelValue`.
3. **Separation of concerns.** Rendering, interaction, state, theming, and i18n are isolated into composables and presentational components.
4. **No runtime dependencies beyond Vue.** The only dependency is `nanoid` (for IDs). `vue` is a peer dependency and is externalized in the library build.
5. **Theme- and locale-agnostic core.** Visual differences are driven by CSS variables and a message map, injected from the top.

---

## 2. Layered Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  FlowchartContainer.vue        (Orchestration / Controller)    │
│  - owns model, selection, history, clipboard, keyboard         │
│  - provides theme / locale / mobile via inject keys            │
│  - wires child events to model mutations                       │
└───────────────┬──────────────────────────────────────────────┘
                │ props + emits
┌───────────────▼──────────────────────────────────────────────┐
│  FlowchartCanvas.vue           (Interaction + SVG Rendering)   │
│  - single <svg>, one world-space <g transform>                 │
│  - pointer-event state machine (DragState union)               │
│  - grid, edges, nodes, free-lines, handles layers              │
└───────┬───────────────┬───────────────────┬──────────────────┘
        │               │                   │
┌───────▼──────┐ ┌──────▼───────┐  ┌────────▼────────┐
│ FlowchartNode│ │ FlowchartEdge │  │ NodeSidebar /   │
│ .vue         │ │ .vue          │  │ ActionBars /    │
│ (SVG shapes +│ │ (orthogonal   │  │ AnchorPoints /  │
│  foreignObj) │ │  routing)     │  │ ResizeHandles / │
└──────────────┘ └──────────────┘  │ TextNodeEditor  │
                                    └─────────────────┘
        │                   │
┌───────▼───────────────────▼──────────────────────────────────┐
│  Composables (state & behavior)                                │
│  useFlowchartModel · useSelection · useEdgeDrawing ·           │
│  useCanvasPanZoom · useDragFromSidebar · useKeyboard ·         │
│  useFlowchartContext · useFlowchartI18n                        │
└───────────────┬──────────────────────────────────────────────┘
                │
┌───────────────▼──────────────────────────────────────────────┐
│  Utils (pure functions)                                        │
│  anchorUtils · colorUtils · edgeRouting · geometry · idGenerator│
└───────────────┬──────────────────────────────────────────────┘
                │
┌───────────────▼──────────────────────────────────────────────┐
│  Types (types/index.ts) · Theme (style/theme.css)             │
└──────────────────────────────────────────────────────────────┘
```

### Component tree (runtime)

```
FlowchartContainer
├── NodeSidebar                      (templates + tool toggles)
├── (sidebar drag ghost)             (floating preview while dragging)
└── <div.canvas-area>
    ├── FlowchartCanvas              (svg)
    │   ├── <defs> grid patterns + arrow markers
    │   ├── <g transform=world>      (single transform group)
    │   │   ├── edges-layer      → FlowchartEdge (×N)
    │   │   ├── free-lines       → <line> (×N)
    │   │   ├── drawing-layer    → in-progress edge preview
    │   │   ├── nodes-layer      → FlowchartNode (×N)
    │   │   │     ├── shape (rect/polygon/ellipse)
    │   │   │     ├── <foreignObject> label
    │   │   │     ├── AnchorPoints
    │   │   │     └── ResizeHandles (when selected)
    │   │   ├── edge-handles-layer → endpoint handles (when selected)
    │   │   └── node-tool-preview
    │   └── TextNodeEditor           (when editing a label)
    ├── .canvas-toolbar              (undo/redo/zoom/reset/delete buttons)
    ├── NodeActionBar                (color picker for node)
    └── EdgeActionBar                (color picker for edge / free-line)
```

---

## 3. Data Flow

### 3.1 `v-model` and the model layer

`FlowchartContainer` receives `modelValue: FlowchartData` and creates the model via:

```ts
const model = useFlowchartModel(modelValueRef, (value) => emit('update:modelValue', value))
```

`useFlowchartModel` keeps its own `internalData` as a **deep clone** of the incoming value and exposes CRUD operations (`addNode`, `updateNode`, `removeNode`, `addEdge`, `removeEdge`, `moveNode`, `setNodePosition`, `resizeNode`, `updateNodeLabel`, `updateNodeStyle`, `addFreeLine`, …).

Every operation follows the same immutable pattern:

```ts
function commit(newData: FlowchartData) {
  internalData.value = newData          // replace reference (reactive trigger)
  emit('update:modelValue', deepClone(newData))  // hand parent a fresh copy
}

function addNode(/* ... */): string {
  const newData = deepClone(internalData.value)
  newData.nodes.push(newNode)
  commit(newData)                        // parent gets a new object, never the internal one
  return newNode.id
}
```

Consequences:

- The parent's `FlowchartData` is **never mutated in place**.
- External changes to `modelValue` are observed by a `watch` inside the model and synced back into `internalData`, so two-way binding works in both directions.

### 3.2 Event wiring

Child components **never** mutate state. `FlowchartCanvas` emits semantic events (`nodeClick`, `nodeDragMove`, `anchorMouseDown`, `edgeReroute`, `freeLineDraw`, `panMove`, …) which `FlowchartContainer` translates into model calls. For example:

```ts
@node-drag-move="(nid, x, y) => model.setNodePosition(nid, x, y)"
@anchor-mouse-up="onAnchorMouseUp"   // → edgeDrawing.finishDrawing(...)
```

This keeps `FlowchartCanvas` a "dumb" renderer/interaction surface and `FlowchartContainer` the single decision-maker.

---

## 4. Rendering Architecture

### 4.1 SVG canvas + one world-space group

`FlowchartCanvas` renders a single `<svg>` that fills its wrapper. Inside it:

- **Screen-space grid.** `<pattern>` definitions (dot grid) are painted as full-size `<rect>`s *outside* the transform group, so the grid stays aligned to the screen and scales with zoom via `gridScreenPx = BASE * level * zoom`.
- **World-space content.** A single `<g :transform="translate(panX, panY) scale(zoom)">` contains everything that lives in diagram coordinates: edges, free lines, the in-progress drawing, nodes, and handles. Panning and zooming are achieved purely by updating this transform — no per-element recomputation.

### 4.2 Coordinate systems

Two coordinate spaces are used:

- **Screen space** — pixels relative to the SVG element (pointer `clientX/Y` minus bounding rect).
- **World space** — diagram coordinates stored in `FlowchartData`.

Conversion (see `useCanvasPanZoom.screenToCanvas` and the local `sc()` helper in the canvas):

```ts
worldX = (screenX - rect.left - viewport.panX) / viewport.zoom
worldY = (screenY - rect.top  - viewport.panY) / viewport.zoom
```

All pointer interactions are immediately converted to world space so node positions, edge anchors, and snapping are zoom-independent.

### 4.3 Node rendering

`FlowchartNode` draws the shape as a native SVG primitive (`<rect>`, `<polygon>`, or `<ellipse>`) and renders the **label inside a `<foreignObject>`** containing an HTML `<div>`. The `foreignObject` is what enables proper text wrapping (`word-break`, `white-space: pre-wrap`) and vertical centering that pure SVG `<text>` cannot do cleanly.

- Default fill is theme-derived (`lightDefaultFill = #fff`, `darkDefaultFill = #3a3a3a`) when `style.backgroundColor` is absent.
- Text color is computed with `contrastColor(bg)` so labels stay readable on any background.
- `AnchorPoints` (4 connection dots) and `ResizeHandles` (8 handles, when selected) are rendered as child SVG groups; their pointer targets carry `data-*` attributes used by the canvas hit-testing.

### 4.4 Edge rendering

`FlowchartEdge` builds its path from `computeOrthogonalWaypoints(...)` → `buildRoundedPath(...)` (see §6). Details:

- A **transparent wider `<path>`** sits under the visible stroke to enlarge the click target.
- Arrowheads use a **per-color `<marker>`** defined in the canvas `<defs>` (one marker per distinct stroke color). This avoids the `fill="context-stroke"` limitation on iOS Safari.
- The optional `label` is placed at the segment midpoint (`geometry.midpoint`).

### 4.5 Grid & snapping

The grid is adaptive: at higher zoom levels, sub-grids (`sub2`, `sub5`, `sub10`) fade in. Snapping uses `geometry.snapToGrid(value, gridSize)` where `gridSize` scales with zoom (`BASE = 15`; smaller steps when zoomed in, larger when zoomed out). This keeps the dot pitch visually stable while keeping node coordinates aligned.

---

## 5. Interaction Model

### 5.1 Unified pointer state machine

All pointer interaction in `FlowchartCanvas` is driven by a single `DragState` discriminated union:

```ts
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

`onPointerDown` inspects `event.target` (via `closest('[data-…]')` attributes) to decide the drag kind; `onPointerMove` advances it; `onPointerUp`/`onPointerCancel` finalize or abort. Using one state variable (instead of many booleans) makes the transition logic easy to reason about and avoids conflicting gestures.

### 5.2 Hit-testing strategy

Rather than hit-testing raw coordinates, the canvas relies on SVG element attributes:

- `[data-node-id]`, `[data-anchor]`, `[data-handle-id]` for nodes/anchors/resize.
- `[data-edge-id]`, `[data-edge-handle]` for edges and their endpoints.
- `[data-freeline-id]`, `[data-freeline-handle]` for free lines.

This keeps geometry out of the event handlers and leverages the browser's own hit-testing.

### 5.3 Drawing an edge

`useEdgeDrawing` is a tiny state machine holding `drawingState` (`{ active, sourceNodeId, sourceAnchor, currentMouseX, currentMouseY }`). On `anchorMouseDown` the container calls `startDrawing`; `onPointerMove` updates the cursor position; on release over a valid target anchor, `finishDrawing` calls `model.addEdge` (which rejects self-loops and duplicates). Clicking empty space cancels.

### 5.4 Pan & zoom

`useCanvasPanZoom` owns the `viewport` (`{ panX, panY, zoom }`). Wheel zoom is **cursor-anchored** (the point under the cursor stays fixed) by adjusting `panX/panY` proportionally to the zoom ratio. `resetView` centers the bounding box of all nodes. `applyPanClamp` prevents the content from being panned fully off-screen when it is larger than the viewport. Zoom is clamped to `[MIN_ZOOM=0.1, MAX_ZOOM=10]`.

---

## 6. Edge Routing Engine

The routing engine (`utils/edgeRouting.ts`) turns a source anchor and a target anchor into a smooth orthogonal polyline that avoids overlapping nodes.

1. **Anchor directions.** Each `AnchorPosition` maps to an outward direction vector (`anchorUtils.getDirectionVector`).
2. **Base shape selection.** Based on the relative direction of the two anchors, the engine picks an L-, Z-, or U-shaped skeleton (exit straight out of the source, enter straight into the target).
3. **Obstacle avoidance.**
   - The source and target node rectangles are always excluded from the obstacle set.
   - For each candidate segment, the engine checks intersection with other node rectangles; if blocked, it inserts detour waypoints around the obstacle.
   - For hard cases it builds a **grid graph** over the bounding region and runs a **Dijkstra shortest path** search with **turn penalties** (fewer bends preferred).
4. **Path cleaning.** Collinear points are merged and duplicates removed.
5. **Rounding.** `buildRoundedPath(waypoints, cornerRadius)` emits an SVG `d` string with rounded corners (default `cornerRadius = 8`, overridable per edge via `EdgeStyle.cornerRadius`).

`NodeRect` (id + rect) is the minimal shape the engine needs; `FlowchartEdge` passes `allNodes` (excluding the two endpoints) so routing can avoid third-party nodes.

---

## 7. Theme System

Theming is **data-attribute + CSS-variable** based, not prop-driven per element.

- `FlowchartContainer` computes `resolvedTheme` and adds the `theme-dark` class to the root `.flowchart-container` when dark.
- `style/theme.css` defines two variable blocks: `.flowchart-container { --fc-*: … }` (light) and `.flowchart-container.theme-dark { --fc-*: … }` (dark). There are 60+ variables spanning canvas, grid, sidebar, action bars, editor, nodes, edges, and text nodes.
- Child components reference only `var(--fc-*)` (e.g. `fill="var(--fc-node-default-stroke)"`). Some SVG-specific values that CSS vars cannot express (grid dot colors, marker fills) are computed in script from `currentTheme`.

To customize, a consumer overrides variables in their own stylesheet loaded after `xiaodao-flowchart/style.css`.

### Dependency injection

`useFlowchartContext` exposes `theme`, `locale`, and `mobile` to every descendant via Vue `provide`/`inject` (`themeKey`, `localeKey`, `mobileKey` from `useFlowchartContext.ts`). Components call `useFlowchartContext()` and read `computed` values with safe defaults, so they work even when used outside the full container (e.g. in unit tests).

---

## 8. Internationalization

`useFlowchartI18n.ts` exports `createI18n(locale)` returning `{ t(key), colorName(hex, isDefault) }`. The `messages` record holds full `zh-CN` and `en-US` maps for every `I18nKey` (sidebar titles, toolbar buttons, node/edge actions, template names, and 40+ color names). `colorName` maps a preset hex back to its localized name for tooltips.

Switching language is as simple as changing the `locale` prop; every consumer recomputes its strings from the injected locale. To add a language, extend `messages` and the `I18nKey` union.

---

## 9. History (Undo / Redo)

`FlowchartContainer` maintains an in-component history:

```ts
const MAX_HISTORY = 50
const history = ref<FlowchartData[]>([])
const historyIndex = ref(-1)
```

- A `watch(modelValue, …, { deep: true })` pushes a deep-cloned snapshot whenever the data changes from **outside** the undo/redo actions.
- `undo()` / `redo()` set `suppressHistory = true` before emitting the restored snapshot, so the subsequent `watch` does not re-record the jump.
- Redo entries ahead of the current index are discarded when a new edit is made.
- Copy/cut/paste use an `internalClipboard` ref; paste regenerates IDs (`idGenerator.generateId`) and offsets the pasted items. Pasting with no internal content falls back to creating a text node from the system clipboard.

---

## 10. Keyboard & Clipboard

`useKeyboard(handlers)` attaches a `window` `keydown` listener (and removes it on unmount). `FlowchartContainer` registers:

- `Delete` / `Backspace` → delete selection (ignored while editing text).
- `Escape` → cancel drawing, clear tools, clear selection, exit edit.
- Arrow keys → nudge selected node by one grid step (`Shift` = 4×).
- `Ctrl/Cmd + Z` / `Shift+Z` / `Y` → undo / redo.
- `Ctrl/Cmd + X` / `C` / `V` → cut / copy / paste (with the external-text fallback described above).

A separate `paste` event listener handles `Ctrl+V` so system-clipboard text can become a text node.

---

## 11. Build & Packaging

The component is shipped as a **Vue library** via Vite's `build.lib` mode (configured in `vite.config.ts`):

- **Library build (`npm run build`)** — entry `src/components/flowchart/index.ts`; formats `es` + `umd`; `vue` externalized. Output goes to `dist/` (`xiaodao-flowchart.es.js`, `xiaodao-flowchart.umd.cjs`, `xiaodao-flowchart.css`) plus `.d.ts` types. `publicDir` is disabled so demo assets are excluded.
- **Demo build (`npm run build:demo`)** — `vite build --mode demo` switches the config to a normal **app** build (entry `index.html` → `App.vue`) into `dist-demo/`, with `publicDir: 'public'` so favicons/assets are copied. This is useful for deploying a live demo; `dist-demo/` is git-ignored, like `dist/`.
- `package.json` `files: ["dist"]` ensures only the library bundle is published to npm; `dist-demo` is naturally excluded.

---

## 12. Extensibility Notes

- **New node shape:** add the type to `NodeType`, render it in `FlowchartNode.vue`, and (optionally) add a sidebar template in `useDragFromSidebar`.
- **New language:** extend `messages` + `I18nKey` in `useFlowchartI18n.ts`.
- **Custom theme:** override `--fc-*` variables after importing the stylesheet.
- **Custom routing:** replace `computeOrthogonalWaypoints` / `buildRoundedPath` in `utils/edgeRouting.ts`; the rest of the stack consumes only the resulting `d` string.
- **Custom persistence:** because state is a plain `FlowchartData` object, you can serialize/restore it (e.g. `JSON.stringify(data.value)`) directly — no proprietary format.

---

## 13. Future Considerations

- The model's deep-clone-per-edit approach is simple and correct but allocates a full copy on every keystroke/drag frame. For very large diagrams, a patch-based or structural-sharing model could reduce GC pressure.
- Pointer capture is used per drag; touch pinch-zoom could be added alongside wheel zoom for richer mobile support.
- The routing engine is synchronous; an idle-time / web-worker scheduler would keep the main thread free on huge graphs.
