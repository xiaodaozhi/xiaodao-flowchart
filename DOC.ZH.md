# xiaodao-flowchart —— 架构设计

本文档描述 `xiaodao-flowchart` 组件的内部架构：各层如何组织、数据如何流动、渲染与交互如何实现，以及路由、主题、国际化、历史记录等核心子系统的实现方式。目标读者是贡献者，以及希望扩展或嵌入该组件的开发者。

> 面向用户的文档见 [README.ZH.md](./README.ZH.md)。本文档的英文版为 [DOC.md](./DOC.md)。

---

## 1. 设计目标

1. **单一数据源。** 所有图状态都存放在父组件通过 `v-model` 持有的单个 `FlowchartData` 对象中。组件**绝不**就地修改父对象的属性，而是在每次变更时 emit 一份新的副本。
2. **单向、可预测的更新。** 所有变更都经由唯一的模型层（`useFlowchartModel`）处理，由它生成不可变快照并 emit `update:modelValue`。
3. **关注点分离。** 渲染、交互、状态、主题、国际化被拆分为各自的 composable 与展示型组件。
4. **除 Vue 外无运行时依赖。** 唯一依赖是 `nanoid`（用于生成 ID）。`vue` 是对等依赖，在库构建中被 externalize（不打包）。
5. **内核与主题/语言无关。** 视觉差异由 CSS 变量与文案映射驱动，并从顶层注入。

---

## 2. 分层架构

```
┌──────────────────────────────────────────────────────────────┐
│  FlowchartContainer.vue        （编排 / 控制器）               │
│  - 持有 model、selection、history、clipboard、keyboard         │
│  - 通过 inject key 提供 theme / locale / mobile               │
│  - 将子组件事件对接到模型变更                                   │
└───────────────┬──────────────────────────────────────────────┘
                │ props + emits
┌───────────────▼──────────────────────────────────────────────┐
│  FlowchartCanvas.vue           （交互 + SVG 渲染）             │
│  - 单个 <svg>，一个世界坐标 <g transform>                      │
│  - 指针事件状态机（DragState 联合类型）                        │
│  - 网格、连线、节点、自由线、手柄等图层                         │
└───────┬───────────────┬───────────────────┬──────────────────┘
        │               │                   │
┌───────▼──────┐ ┌──────▼───────┐  ┌────────▼────────┐
│ FlowchartNode│ │ FlowchartEdge │  │ NodeSidebar /   │
│ .vue         │ │ .vue          │  │ ActionBars /    │
│ (SVG 形状 +  │ │ (正交路由)     │  │ AnchorPoints /  │
│  foreignObj) │ │               │  │ ResizeHandles / │
└──────────────┘ └──────────────┘  │ TextNodeEditor  │
                                    └─────────────────┘
        │                   │
┌───────▼───────────────────▼──────────────────────────────────┐
│  Composables（状态与行为）                                     │
│  useFlowchartModel · useSelection · useEdgeDrawing ·          │
│  useCanvasPanZoom · useDragFromSidebar · useKeyboard ·        │
│  useFlowchartContext · useFlowchartI18n                        │
└───────────────┬──────────────────────────────────────────────┘
                │
┌───────────────▼──────────────────────────────────────────────┐
│  Utils（纯函数）                                               │
│  anchorUtils · colorUtils · edgeRouting · geometry · idGenerator│
└───────────────┬──────────────────────────────────────────────┘
                │
┌───────────────▼──────────────────────────────────────────────┐
│  Types（types/index.ts）· Theme（style/theme.css）            │
└──────────────────────────────────────────────────────────────┘
```

### 运行时组件树

```
FlowchartContainer
├── NodeSidebar                      （模板 + 工具开关）
├── (侧边栏拖拽幽灵)                 （拖拽时的浮动预览）
└── <div.canvas-area>
    ├── FlowchartCanvas              (svg)
    │   ├── <defs> 网格 pattern + 箭头 marker
    │   ├── <g transform=world>      （单一变换组）
    │   │   ├── edges-layer      → FlowchartEdge (×N)
    │   │   ├── free-lines       → <line> (×N)
    │   │   ├── drawing-layer    → 进行中的连线预览
    │   │   ├── nodes-layer      → FlowchartNode (×N)
    │   │   │     ├── 形状 (rect/polygon/ellipse)
    │   │   │     ├── <foreignObject> 标签
    │   │   │     ├── AnchorPoints
    │   │   │     └── ResizeHandles（选中时显示）
    │   │   ├── edge-handles-layer → 端点手柄（选中时显示）
    │   │   └── node-tool-preview
    │   └── TextNodeEditor           （编辑标签时显示）
    ├── .canvas-toolbar              （撤销/重做/缩放/重置/删除按钮）
    ├── NodeActionBar                （节点取色器）
    └── EdgeActionBar                （连线 / 自由线取色器）
```

---

## 3. 数据流

### 3.1 `v-model` 与模型层

`FlowchartContainer` 接收 `modelValue: FlowchartData`，并通过以下方式创建模型：

```ts
const model = useFlowchartModel(modelValueRef, (value) => emit('update:modelValue', value))
```

`useFlowchartModel` 将自身的 `internalData` 保存为传入值的**深拷贝**，并暴露一系列 CRUD 操作（`addNode`、`updateNode`、`removeNode`、`addEdge`、`removeEdge`、`moveNode`、`setNodePosition`、`resizeNode`、`updateNodeLabel`、`updateNodeStyle`、`addFreeLine` 等）。

每个操作都遵循相同的不可变模式：

```ts
function commit(newData: FlowchartData) {
  internalData.value = newData          // 替换引用（触发响应式）
  emit('update:modelValue', deepClone(newData))  // 向父组件交出一份新副本
}

function addNode(/* ... */): string {
  const newData = deepClone(internalData.value)
  newData.nodes.push(newNode)
  commit(newData)                        // 父组件拿到的是新对象，而非内部对象
  return newNode.id
}
```

由此带来的结果：

- 父组件的 `FlowchartData` **绝不会被就地修改**。
- 对 `modelValue` 的外部修改会被模型内部的 `watch` 监听并同步回 `internalData`，因此双向绑定在两条方向上都生效。

### 3.2 事件接线

子组件**绝不**修改状态。`FlowchartCanvas` 只 emit 语义化事件（`nodeClick`、`nodeDragMove`、`anchorMouseDown`、`edgeReroute`、`freeLineDraw`、`panMove` 等），由 `FlowchartContainer` 翻译成模型调用。例如：

```ts
@node-drag-move="(nid, x, y) => model.setNodePosition(nid, x, y)"
@anchor-mouse-up="onAnchorMouseUp"   // → edgeDrawing.finishDrawing(...)
```

这使得 `FlowchartCanvas` 成为“哑”的渲染/交互面，而 `FlowchartContainer` 成为唯一的决策中心。

---

## 4. 渲染架构

### 4.1 SVG 画布 + 单一世界坐标组

`FlowchartCanvas` 渲染一个填满容器的 `<svg>`。其内部：

- **屏幕空间网格。** `<pattern>` 定义（点阵网格）以全尺寸 `<rect>` 的形式绘制在变换组**之外**，因此网格始终贴合屏幕，并随缩放通过 `gridScreenPx = BASE * level * zoom` 变化。
- **世界空间内容。** 一个 `<g :transform="translate(panX, panY) scale(zoom)">` 包含一切位于图坐标中的元素：连线、自由线、进行中的绘制、节点与手柄。平移与缩放仅通过更新此变换实现——无需逐元素重算。

### 4.2 坐标系

使用两套坐标系：

- **屏幕空间** —— 相对于 SVG 元素的像素（`pointer` 的 `clientX/Y` 减去包围盒）。
- **世界空间** —— 存储在 `FlowchartData` 中的图坐标。

转换方式（见 `useCanvasPanZoom.screenToCanvas` 与画布内的本地 `sc()` 辅助函数）：

```ts
worldX = (screenX - rect.left - viewport.panX) / viewport.zoom
worldY = (screenY - rect.top  - viewport.panY) / viewport.zoom
```

所有指针交互都会立即转换到世界空间，因此节点位置、连线锚点与吸附都与缩放无关。

### 4.3 节点渲染

`FlowchartNode` 将形状绘制为原生 SVG 图元（`<rect>`、`<polygon>` 或 `<ellipse>`），并把**标签渲染在 `<foreignObject>` 内的 HTML `<div>` 中**。`foreignObject` 正是实现纯 SVG `<text>` 难以做到的文本换行（`word-break`、`white-space: pre-wrap`）与垂直居中的关键。

- 当 `style.backgroundColor` 缺省时，默认填充色随主题推导（`lightDefaultFill = #fff`，`darkDefaultFill = #3a3a3a`）。
- 文字颜色通过 `contrastColor(bg)` 计算，确保在任何背景上都可读。
- `AnchorPoints`（4 个连接点）与 `ResizeHandles`（选中时的 8 个手柄）作为子 SVG 组渲染；它们的指针目标带有 `data-*` 属性，供画布命中测试使用。

### 4.4 连线渲染

`FlowchartEdge` 通过 `computeOrthogonalWaypoints(...)` → `buildRoundedPath(...)` 构建路径（见 §6）。细节：

- 在可见描边之下放置一条**透明的更宽 `<path>`**，以扩大点击命中区域。
- 箭头使用在画布 `<defs>` 中定义的**按颜色 `<marker>`**（每种描边颜色一个 marker）。这规避了 iOS Safari 对 `fill="context-stroke"` 的限制。
- 可选的 `label` 放置在分段中点（`geometry.midpoint`）。

### 4.5 网格与吸附

网格是自适应的：在更高缩放级别下，子网格（`sub2`、`sub5`、`sub10`）会逐渐显现。吸附使用 `geometry.snapToGrid(value, gridSize)`，其中 `gridSize` 随缩放变化（`BASE = 15`；放大时步长更小，缩小时更大）。这样既保持点距在视觉上稳定，又使节点坐标始终对齐。

---

## 5. 交互模型

### 5.1 统一的指针状态机

`FlowchartCanvas` 中的所有指针交互都由一个 `DragState` 可辨识联合类型驱动：

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

`onPointerDown` 检查 `event.target`（通过 `closest('[data-…]')` 属性）来决定拖拽类型；`onPointerMove` 推进状态；`onPointerUp`/`onPointerCancel` 完成或中止。使用单一状态变量（而非多个布尔值）使转换逻辑易于推理，并避免手势冲突。

### 5.2 命中测试策略

画布不依赖原始坐标做命中测试，而是利用 SVG 元素属性：

- 节点/锚点/缩放：`[data-node-id]`、`[data-anchor]`、`[data-handle-id]`。
- 连线及其端点：`[data-edge-id]`、`[data-edge-handle]`。
- 自由线：`[data-freeline-id]`、`[data-freeline-handle]`。

这使得几何计算脱离事件处理函数，并复用浏览器自身的命中测试。

### 5.3 绘制连线

`useEdgeDrawing` 是一个保存 `drawingState`（`{ active, sourceNodeId, sourceAnchor, currentMouseX, currentMouseY }`）的小型状态机。在 `anchorMouseDown` 时容器调用 `startDrawing`；`onPointerMove` 更新光标位置；在有效目标锚点上方释放时，`finishDrawing` 调用 `model.addEdge`（它会拒绝自连接与重复连线）。点击空白处则取消。

### 5.4 平移与缩放

`useCanvasPanZoom` 持有 `viewport`（`{ panX, panY, zoom }`）。滚轮缩放是**以光标为锚点**的（光标下的点保持不动），通过按缩放比例调整 `panX/panY` 实现。`resetView` 将所有节点的包围盒居中。`applyPanClamp` 在内容大于视口时，防止其被完全移出屏幕。缩放被限制在 `[MIN_ZOOM=0.1, MAX_ZOOM=10]`。

---

## 6. 连线路由引擎

路由引擎（`utils/edgeRouting.ts`）将源锚点与目标锚点转换为一条平滑的正交折线，并规避与其他节点的重叠。

1. **锚点方向。** 每个 `AnchorPosition` 映射到一个向外的方向向量（`anchorUtils.getDirectionVector`）。
2. **基础形状选择。** 根据两个锚点的相对方向，引擎选择 L 形、Z 形或 U 形的骨架（从源节点笔直引出，笔直进入目标节点）。
3. **障碍规避。**
   - 源节点与目标节点矩形始终被排除在障碍集合之外。
   - 对每条候选线段，引擎检查其是否与其他节点矩形相交；若被阻挡，则插入绕开障碍的途经点。
   - 对于困难情形，它在包围区域上构建**网格图**，并运行带**转弯惩罚**的 **Dijkstra 最短路径**搜索（优先更少弯折）。
4. **路径清理。** 合并共线点、去除重复相邻点。
5. **圆角处理。** `buildRoundedPath(waypoints, cornerRadius)` 输出带圆角的 SVG `d` 字符串（默认 `cornerRadius = 8`，可通过 `EdgeStyle.cornerRadius` 按连线覆盖）。

`NodeRect`（id + 矩形）是引擎所需的最小形状；`FlowchartEdge` 传入 `allNodes`（排除两端点），使路由能够规避第三方节点。

---

## 7. 主题系统

主题基于**数据属性 + CSS 变量**，而非逐元素 prop。

- `FlowchartContainer` 计算 `resolvedTheme`，并在根 `.flowchart-container` 上于深色时添加 `theme-dark` 类。
- `style/theme.css` 定义了两组变量块：`.flowchart-container { --fc-*: … }`（浅色）与 `.flowchart-container.theme-dark { --fc-*: … }`（深色）。共有 60+ 个变量，覆盖画布、网格、侧边栏、操作栏、编辑器、节点、连线与文本节点。
- 子组件只引用 `var(--fc-*)`（例如 `fill="var(--fc-node-default-stroke)"`）。少数 CSS 变量无法表达的值（网格点颜色、marker 填充）在脚本中根据 `currentTheme` 计算。

要自定义主题，使用者只需在引入 `xiaodao-flowchart/style.css` **之后**的自身样式表中覆盖相应变量。

### 依赖注入

`useFlowchartContext` 通过 Vue 的 `provide`/`inject`（`useFlowchartContext.ts` 中的 `themeKey`、`localeKey`、`mobileKey`）向每个后代暴露 `theme`、`locale` 与 `mobile`。组件调用 `useFlowchartContext()` 并读取带安全默认值的 `computed`，因此即便在完整容器之外使用（例如单元测试中）也能正常工作。

---

## 8. 国际化

`useFlowchartI18n.ts` 导出 `createI18n(locale)`，返回 `{ t(key), colorName(hex, isDefault) }`。`messages` 记录为每个 `I18nKey` 保存了完整的 `zh-CN` 与 `en-US` 映射（侧边栏标题、工具栏按钮、节点/连线操作、模板名称，以及 40+ 个颜色名称）。`colorName` 将预设的十六进制颜色映射回其本地化名称，用于提示。

切换语言只需修改 `locale` 属性；每个消费者都会从注入的语言重新计算其文案。要新增语言，请扩展 `messages` 与 `I18nKey` 联合类型。

---

## 9. 历史记录（撤销 / 重做）

`FlowchartContainer` 在组件内维护一份历史：

```ts
const MAX_HISTORY = 50
const history = ref<FlowchartData[]>([])
const historyIndex = ref(-1)
```

- 一个 `watch(modelValue, …, { deep: true })` 会在数据**来自撤销/重做之外**的变更时，压入一份深拷贝快照。
- `undo()` / `redo()` 在 emit 恢复出的快照前设置 `suppressHistory = true`，使随后的 `watch` 不会把这次跳转再次记录。
- 当做出新编辑时，会丢弃当前索引之前的重做条目。
- 复制/剪切/粘贴使用 `internalClipboard` ref；粘贴时会重新生成 ID（`idGenerator.generateId`）并偏移粘贴项的位置。在没有任何内部内容时粘贴，则回退为从系统剪贴板创建文本节点。

---

## 10. 键盘与剪贴板

`useKeyboard(handlers)` 绑定 `window` 的 `keydown` 监听器（卸载时移除）。`FlowchartContainer` 注册了：

- `Delete` / `Backspace` → 删除选中项（编辑文本时忽略）。
- `Escape` → 取消绘制、清除工具、清除选中、退出编辑。
- 方向键 → 按一格微移选中节点（`Shift` = 4 倍）。
- `Ctrl/Cmd + Z` / `Shift+Z` / `Y` → 撤销 / 重做。
- `Ctrl/Cmd + X` / `C` / `V` → 剪切 / 复制 / 粘贴（含上述外部文本回退）。

另有一个独立的 `paste` 事件监听器处理 `Ctrl+V`，使系统剪贴板文本可成为文本节点。

---

## 11. 构建与打包

该组件以 Vite 的 `build.lib` 模式作为 **Vue 库**发布（配置见 `vite.config.ts`）：

- **库构建（`npm run build`）** —— 入口 `src/components/flowchart/index.ts`；格式 `es` + `umd`；`vue` 被 externalize。产物输出到 `dist/`（`xiaodao-flowchart.es.js`、`xiaodao-flowchart.umd.cjs`、`xiaodao-flowchart.css`）以及 `.d.ts` 类型声明。`publicDir` 被禁用，因此演示资源不会进入库包。
- **演示构建（`npm run build:demo`）** —— `vite build --mode demo` 将配置切换为普通**应用**构建（入口 `index.html` → `App.vue`），输出到 `dist-demo/`，并启用 `publicDir: 'public'` 以拷贝 favicon 等资源。它适用于部署在线演示；`dist-demo/` 与 `dist/` 一样被 git 忽略。
- `package.json` 中的 `files: ["dist"]` 确保只有库包被发布到 npm；`dist-demo` 自然被排除。

---

## 12. 扩展性说明

- **新增节点形状：** 在 `NodeType` 中加入类型，在 `FlowchartNode.vue` 中渲染，并（可选）在 `useDragFromSidebar` 中增加侧边栏模板。
- **新增语言：** 扩展 `useFlowchartI18n.ts` 中的 `messages` 与 `I18nKey`。
- **自定义主题：** 在引入样式表之后覆盖 `--fc-*` 变量。
- **自定义路由：** 替换 `utils/edgeRouting.ts` 中的 `computeOrthogonalWaypoints` / `buildRoundedPath`；其余部分只消费生成的 `d` 字符串。
- **自定义持久化：** 由于状态就是普通的 `FlowchartData` 对象，可直接序列化/恢复（例如 `JSON.stringify(data.value)`）——无需专有格式。

---

## 13. 后续考量

- 模型“每次编辑都深拷贝”的方式简单且正确，但会在每次按键/拖拽帧都分配完整副本。对于超大型图，基于补丁或结构共享的模型可减少 GC 压力。
- 目前拖拽使用按次的指针捕获；可在滚轮缩放之外加入触摸双指缩放，以提供更丰富的移动端支持。
- 路由引擎是同步的；对于巨型图，空闲时段 / Web Worker 调度可保持主线程空闲。
