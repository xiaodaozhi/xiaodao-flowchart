# xiaodao-flowchart：架构设计文档

[中文](./DOC.ZH.md) | **English**

一个基于 Vue 3、使用 SVG 渲染的流程图组件。它提供类似 Excel 的节点/连线编辑画布：从侧边栏拖出节点、在锚点之间绘制正交连线、手绘自由线、缩放与改色、平移与缩放、撤销与重做，并通过 `v-model` 双向绑定整张图。

> 面向用户的文档见 [README.md](./README.md)，本文档的中文版即本文件（英文版见 [DOC.md](./DOC.md)）。

---

## 1. 技术栈

| 层 | 选型 | 版本 |
|---|---|---|
| 框架 | Vue 3（Composition API + `<script setup>`） | ^3.3 |
| 构建 | Vite | ^5.0 |
| 语言 | TypeScript（strict） | ~5.4 |
| 渲染 | SVG 2（单一世界坐标变换组） | - |
| 类型检查 | vue-tsc | ^2.0 |
| 包管理器 | pnpm | - |
| 运行时依赖 | nanoid（生成 id，库构建中已 externalize） | ^5.0 |

---

## 2. 文件结构

```text
src/
├── main.ts                         # createApp(App).mount('#app')
├── App.vue                         # 演示应用（设置 document.title，挂载 FlowchartContainer）
├── index.ts                        # 库入口的再导出
└── components/flowchart/
    ├── index.ts                    # 统一出口：FlowchartContainer + 全部类型
    ├── FlowchartContainer.vue      # 编排 / 控制器（模型、选择、历史、剪贴板、键盘）
    ├── FlowchartCanvas.vue         # SVG 画布 + 单一指针状态机
    ├── FlowchartNode.vue           # 节点形状 + foreignObject 标签 + 锚点 + 缩放手柄
    ├── FlowchartEdge.vue           # 正交连线渲染（路由路径 + 箭头 marker）
    ├── NodeSidebar.vue             # 模板 + 工具开关（拖拽源）
    ├── AnchorPoints.vue            # 每个节点的 4 个连接点
    ├── ResizeHandles.vue           # 选中节点的 8 个缩放手柄
    ├── TextNodeEditor.vue          # 行内标签编辑器（HTML textarea 浮层）
    ├── NodeActionBar.vue           # 选中节点的取色条
    ├── EdgeActionBar.vue           # 选中连线 / 自由线的取色条
    ├── style/
    │   └── theme.css               # CSS 变量主题块（亮色 + 暗色）
    ├── composables/
    │   ├── useFlowchartContext.ts  # provide/inject 的 key + theme/locale/mobile
    │   ├── useFlowchartI18n.ts     # 文案表 + createI18n()
    │   ├── useFlowchartModel.ts    # v-model + 不可变提交 + CRUD 操作
    │   ├── useSelection.ts         # 选择状态（节点 / 连线 / 自由线）
    │   ├── useCanvasPanZoom.ts     # 视口（panX/panY/zoom）+ 以光标为锚点的滚轮缩放
    │   ├── useEdgeDrawing.ts       # 连线绘制状态机
    │   ├── useDragFromSidebar.ts   # 侧边栏拖拽/放置节点模板
    │   ├── useNodeDrag.ts          # 节点拖拽辅助（可用）
    │   ├── useNodeResize.ts        # 节点缩放辅助（可用）
    │   └── useKeyboard.ts          # 键盘快捷键注册
    ├── types/
    │   └── index.ts                # 全部类型定义 + 共享常量
    └── utils/
        ├── anchorUtils.ts         # 锚点坐标数学（显示坐标 + 逻辑坐标）
        ├── colorUtils.ts          # 预设调色板 + contrastColor()
        ├── edgeRouting.ts         # 正交路由引擎（waypoints + Dijkstra）
        ├── geometry.ts            # snapToGrid / clamp / midpoint
        └── idGenerator.ts         # nanoid 封装
```

**依赖方向**：`App.vue → index.ts → FlowchartContainer → FlowchartCanvas + 子组件`，`composables/*` 与 `utils/*` 位于组件之下。`FlowchartCanvas` 是一个“哑”渲染器：它从不修改数据模型，只发出语义化指针事件，`FlowchartContainer` 把这些事件翻译成模型调用。

---

## 3. 类型系统

全部类型定义在 `types/index.ts`。

```typescript
// 节点类别
type NodeType = 'rectangle' | 'diamond' | 'ellipse' | 'parallelogram' | 'text';

// 视觉主题与语言
type Theme = 'light' | 'dark';
type Locale = 'zh-CN' | 'en-US';

// 节点上的连接锚点（4 个边）
type AnchorPosition = 'top' | 'right' | 'bottom' | 'left';

// 缩放手柄 id（8 个手柄）
type ResizeHandleId
  = | 'top-left' | 'top-center' | 'top-right'
    | 'middle-left' | 'middle-right'
    | 'bottom-left' | 'bottom-center' | 'bottom-right';

// 节点视觉样式（字段均可选；缺省字段使用主题默认值）
interface NodeStyle {
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  textColor?: string;
  fontSize?: number;
  borderRadius?: number;
  opacity?: number;
}

// 连线视觉样式
interface EdgeStyle {
  strokeColor?: string;
  strokeWidth?: number;
  cornerRadius?: number;   // 覆盖默认圆角半径
}

// 自由线（注释笔画）视觉样式
interface FreeLineStyle {
  strokeColor?: string;
  strokeWidth?: number;
}

// 单个节点
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

// 两个节点锚点之间的一条连线
interface FlowchartEdge {
  id: string;
  sourceNodeId: string;
  sourceAnchor: AnchorPosition;
  targetNodeId: string;
  targetAnchor: AnchorPosition;
  label?: string;
  style?: EdgeStyle;
}

// 自由注释线（不挂接节点）
interface FreeLine {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  style?: FreeLineStyle;
}

// 顶层图文档（v-model 载荷）
interface FlowchartData {
  nodes: FlowchartNode[];
  edges: FlowchartEdge[];
  freeLines?: FreeLine[];
}

// 侧边栏模板描述
interface SidebarNodeTemplate {
  type: NodeType;
  label: string;
  defaultWidth: number;
  defaultHeight: number;
}

// 相机状态
interface CanvasViewport {
  panX: number;
  panY: number;
  zoom: number;
}

// 选择快照
interface SelectionState {
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
}

// 进行中的连线绘制状态
interface EdgeDrawingState {
  active: boolean;
  sourceNodeId: string;
  sourceAnchor: AnchorPosition;
  currentMouseX: number;
  currentMouseY: number;
}

// 进行中的缩放拖拽状态（辅助）
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

// 共享常量
const DEFAULT_NODE_STYLE: Required<NodeStyle>;     // 白底、#333 边框、2px、黑字、14px、圆角 4、不透明 1
const DEFAULT_EDGE_STYLE: Required<EdgeStyle>;     // #555 描边、2px、圆角 8
const DEFAULT_FREE_LINE_STYLE: Required<FreeLineStyle>; // #555 描边、2px
const MIN_NODE_WIDTH = 40;
const MIN_NODE_HEIGHT = 30;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 10.0;
const ZOOM_STEP = 1.08;
const GRID_SIZE = 15;
const BASE_GRID_SIZE = 15;
```

---

## 4. 数据模型

### 4.1 核心状态

| 状态 | 类型 | 归属 | 说明 |
|---|---|---|---|
| `internalData` | `ref<FlowchartData>` | `useFlowchartModel` | 对入参 `modelValue` 的深拷贝；渲染所用的唯一数据源 |
| `viewport` | `ref<CanvasViewport>` | `useCanvasPanZoom` | `{ panX, panY, zoom }`；相机，由滚轮、工具栏按钮、拖拽更新 |
| `selection` | `{ selectedNodeId, selectedEdgeId, selectedFreeLineId }` | `useSelection` | 当前选择（同一时刻仅一种类型生效） |
| `drawingState` | `ref<EdgeDrawingState \| null>` | `useEdgeDrawing` | 正在从锚点拉出的连线 |
| `editingNodeId` | `ref<string \| null>` | `FlowchartContainer` | 正在行内编辑标签的节点 |
| `history` | `ref<FlowchartData[]>` | `FlowchartContainer` | 撤销/重做快照栈（最多 50） |
| `historyIndex` | `ref<number>` | `FlowchartContainer` | `history` 中的指针，其后为可重做项 |
| `internalClipboard` | `ref<FlowchartData \| null>` | `FlowchartContainer` | 复制/剪切的内部缓冲区 |
| `lineToolActive` | `ref<boolean>` | `FlowchartContainer` | 自由线绘制工具开关（Shift+点击也可触发） |
| `selectedNodeTool` | `ref<NodeType \| null>` | `FlowchartContainer` | 侧边栏激活的节点工具（点击拖拽放置） |

### 4.2 v-model 数据同步

`FlowchartContainer` 只创建一次模型：

```typescript
const model = useFlowchartModel(modelValueRef, (value) => emit('update:modelValue', value));
```

`useFlowchartModel` 把 `internalData` 保存为对入参的深拷贝，并暴露 CRUD 操作（`addNode`、`updateNode`、`removeNode`、`addEdge`、`removeEdge`、`moveNode`、`setNodePosition`、`resizeNode`、`updateNodeLabel`、`updateNodeStyle`、`addFreeLine` 等）。每个操作都遵循同一套不可变模式：

```typescript
function commit(newData: FlowchartData) {
  internalData.value = newData;                       // 替换引用（触发响应式）
  emit('update:modelValue', deepClone(newData));      // 交给父组件一份全新拷贝
}

function addNode(/* ... */): string {
  const newData = deepClone(internalData.value);
  newData.nodes.push(newNode);
  commit(newData);                                    // 父组件拿到的是新对象，而非内部对象
  return newNode.id;
}
```

由此带来：

- 父组件的 `FlowchartData` 永不被原地修改。
- 模型内有一个 `watch`（`{ deep: true }`）监听 `modelValue` 的外部变更并同步回 `internalData`，因此双向绑定在正反两个方向都成立。
- 因为载荷是普通 JSON 可序列化对象，持久化很简单：`JSON.stringify(data.value)` 即可无格式损失地往返。

---

## 5. 布局常量与坐标系

```text
GRID_SIZE        = 15    （世界单位下的基础网格间距）
BASE_GRID_SIZE   = 15    （相同值，画布网格数学使用）
MIN_NODE_WIDTH   = 40
MIN_NODE_HEIGHT  = 30
MIN_ZOOM         = 0.1
MAX_ZOOM         = 10.0
ZOOM_STEP        = 1.08  （每次滚轮刻度 / 工具栏点击）
EXIT_MARGIN      = 40    （连线路由：连线离开节点后直行多远才转弯）
NODE_PADDING     = 15    （连线路由：节点周围的障碍膨胀）
BEND_PENALTY     = 20    （连线路由：网格搜索中每次转弯的附加代价）
MAX_AVOIDANCE_PASSES = 80 （连线路由：局部绕行的最大迭代次数）
```

### 5.1 两套坐标系

- **屏幕坐标**：相对 SVG 容器的 CSS 像素（`event.clientX/Y` 减去包围盒）。
- **世界坐标**：`FlowchartData` 中存储的图坐标（节点 `x/y`、锚点、连线 waypoint）。

所有指针输入都会立即转换为世界坐标，使位置、锚点和吸附都与缩放无关：

```typescript
worldX = (screenX - rect.left - viewport.panX) / viewport.zoom
worldY = (screenY - rect.top  - viewport.panY) / viewport.zoom
```

这就是 `useCanvasPanZoom.screenToCanvas` 与 `FlowchartCanvas` 里的本地 `sc()` 辅助函数。

### 5.2 自适应网格

网格间距在各缩放级别下保持视觉稳定。画布先算出 `gridLevel`（在 `zoom <= 0.1` 时为 8，`<= 0.25` 时为 4，`<= 0.5` 时为 2，否则为 1），再推导：

```text
gridScreenPx = BASE * gridLevel * zoom     （屏幕像素下的点间距）
snapSize     = zoom >= 10 ? 1.5
             : zoom >= 5  ? 3
             : zoom >= 2  ? 7.5
             : 15 * gridLevel                  （节点坐标吸附到的世界单位）
```

子网格（`sub2`、`sub5`、`sub10`）在 `zoom >= 2 / 5 / 10` 时淡入，使密集网格依然清晰。吸附使用 `geometry.snapToGrid(value, snapSize)`。

---

## 6. 渲染管线

### 6.1 一个 SVG，一个世界坐标组

`FlowchartCanvas` 渲染一个填满容器的 `<svg>`。其内部：

- **屏幕坐标网格**：`<pattern>` 定义的圆点网格作为铺满的 `<rect>` 绘制在变换组*之外*，因此网格始终对齐屏幕，并随缩放通过 `gridScreenPx = BASE * level * zoom` 伸缩。平移偏移通过 pattern 的 `x`/`y` 属性施加。
- **世界坐标内容**：一个 `<g :transform="translate(panX, panY) scale(zoom)">` 承载所有图坐标内容：连线、自由线、进行中的绘制、节点与手柄。平移和缩放纯粹靠更新这个变换实现，无需逐元素重算。

因为是 SVG（而非 Canvas 2D），没有 DPR 缩放步骤，也没有手动的 `requestAnimationFrame` 重绘循环：Vue 的响应式直接重渲染受影响的 DOM 节点。因此“渲染管线”是声明式的，而非命令式的。

### 6.2 绘制顺序（变换组内）

1. `edges-layer`：`FlowchartEdge` 组件（路由路径 + 箭头 marker），随后是自由线（带更宽透明命中区的 `<line>` + 可见描边 + 选中时的端点手柄）。
2. `drawing-layer`：进行中的连线预览（`drawingState.active` 时显示虚线路径 + 箭头）。
3. `nodes-layer`：`FlowchartNode` 组件（形状 + `foreignObject` 标签 + `AnchorPoints` + 选中时的 `ResizeHandles`）。
4. `edge-handles-layer`：选中连线的源/目标端点手柄（拖拽以重新布线）。
5. 自由线绘制预览与节点工具预览浮层。

`TextNodeEditor` 作为 HTML 浮层渲染在 `<svg>` *之外*（绝对定位），由 `editingInfo` 驱动，使其在世界变换下与节点保持对齐。

### 6.3 箭头

箭头使用在画布 `<defs>` 中定义的**每色一个 `<marker>`**（每种描边颜色一个）。这规避了 iOS Safari 不支持 `fill="context-stroke"` 的限制。`FlowchartEdge` 引用 `url(#arrowhead-<hex>)`，使每条连线得到颜色正确的箭头。

---

## 7. 连线路由引擎

路由引擎（`utils/edgeRouting.ts`）把一个源锚点和一个目标锚点转换为一条平滑的正交折线，并避开重叠的节点。两个公开函数驱动它：

```typescript
computeOrthogonalWaypoints(
  source: Point, sourceAnchor: AnchorPosition,
  target: Point, targetAnchor: AnchorPosition,
  allNodes?: NodeRect[], excludeNodeIds?: string[],
  sourceRect?: Rect, targetRect?: Rect,
): Point[]

buildRoundedPath(points: Point[], cornerRadius: number): string   // 返回 SVG 的 `d` 字符串
```

`NodeRect`（id + type + x/y/width/height）是引擎所需的最小形状；`FlowchartEdge` 传入 `allNodes`（排除两端节点），使路由能避开第三方节点。

### 7.1 锚点方向

每个 `AnchorPosition` 映射到一个向外的方向向量（`anchorUtils.getDirectionVector`）：`top → (0,-1)`、`right → (1,0)`、`bottom → (0,1)`、`left → (-1,0)`。

### 7.2 基础形状选择

`buildSafeWaypoints` 先尝试最廉价的路径：

- 完美对齐的一对相对锚点（如同一行的右对左）直接连成直线。
- 否则它先直着离开源锚点（`EXIT_MARGIN` 单位），再直着进入目标锚点，然后用 L、Z 或 U 形骨架连接，骨架由两锚点的相对朝向选择（`sameSide`、`bothH`、`bothV`、`hToV`、`vToH`）。
- 对每个候选拐角测试 `cornerSafe`：两段子线段都不得触碰任一节点本体。若直接拐角受阻，就尝试备用拐角，再沿垂直轴越过节点、通过 `safeCrossCoord` 在垂直轴上穿越。

### 7.3 障碍规避

当传入 `allNodes` 时，`avoidThirdPartyNodes` 在基础骨架上继续执行：

1. 若 `findFirstBlockedSegment` 未发现受阻线段，则跳过路由。
2. 否则先尝试全局绕行 `routeAroundAllNodes`，它在包围区域上构建**网格图**（见 7.4）并跑最短路搜索。
3. 若全局路由失败，回退到局部迭代方案：最多 `MAX_AVOIDANCE_PASSES`（80）次，每次找到第一个受阻线段并用 `routeAroundNode` 绕开该单个节点（按行进方向从顶部/底部或左/右绕），随后 `cleanPath` 合并共线点。

文字节点（`type === 'text'`）被排除在障碍之外，因此连线可以穿过注释文字。

### 7.4 网格图 + Dijkstra

对于困难情形，`findGridRoute` 构建一个正交网格图：

- 它收集每一个相关的 x 与 y 坐标：端点、基础 waypoint，以及每个障碍节点的膨胀包围盒（`NODE_PADDING` 膨胀），然后去重排序。
- 它只保留不在任何膨胀节点内部的网格点（`pointBlocked`），并把相邻共线、且线段清晰（`segmentClear`）的点用代价等于曼哈顿距离的边连接起来。
- `runShortestPath` 跑一致代价（Dijkstra）搜索，每个状态还记录进入方向。方向改变时附加**转弯代价**（`BEND_PENALTY = 20`），因此引擎偏好转弯更少的路径。搜索可以要求最后一段以正确轴向进入目标（`endDir`）。

### 7.5 路径清理与圆角

- `cleanPath` 删除连续的重复点，并把三个及以上共线点折叠为单个转弯，使折线最小。
- `buildRoundedPath` 输出最终的 SVG `d` 字符串。默认 `cornerRadius` 为 `8`（来自 `DEFAULT_EDGE_STYLE`），可通过 `EdgeStyle.cornerRadius` 逐连线覆盖。

路由结果是一个纯 `Point[]`，因此调用方只消费最终的 `d` 字符串。自定义路由可以替换 `computeOrthogonalWaypoints` / `buildRoundedPath`，而不必改动其余层次。

---

## 8. 交互模型

### 8.1 统一的指针状态机

`FlowchartCanvas` 中所有指针交互都由单个 `DragState` 可辨识联合驱动：

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

`onPointerDown` 检查 `event.target`（通过 `closest('[data-…]')` 属性）来决定拖拽类型；`onPointerMove` 推进它；`onPointerUp` / `onPointerCancel` 完成或中止。用一个状态变量（而非多个布尔）使转移逻辑易于推理，并避免手势冲突。

### 8.2 命中测试策略

画布不对手工坐标做命中测试，而是依赖 SVG 元素属性：

- 节点 / 锚点 / 缩放手柄使用 `[data-node-id]`、`[data-anchor]`、`[data-handle-id]`。
- 连线及其端点使用 `[data-edge-id]`、`[data-edge-handle]`。
- 自由线使用 `[data-freeline-id]`、`[data-freeline-handle]`。

这样把几何排除在事件处理之外，并复用浏览器自身的命中测试。连线重布线与连线绘制的悬停高亮使用邻近测试（`findAnchorNearPoint`，半径约 20 到 25 世界单位）。

### 8.3 鼠标

| 操作 | 行为 |
|---|---|
| 单击节点 | 选中节点（emit `nodeSelect`） |
| 拖拽节点 | 移动节点（吸附到网格） |
| 双击节点 | 进入行内标签编辑 |
| 单击连线 | 选中连线（emit `edgeSelect`） |
| 拖拽连线端点手柄 | 重布线到邻近锚点 |
| 拖拽空白画布 | 平移 |
| 中键拖拽 | 平移 |
| 滚轮 | 以光标为锚点的缩放 |
| 单击自由线 | 选中自由线 |
| 拖拽自由线端点 / 整体 | 移动端点 / 整条线 |
| Shift+点击 或 在空白画布用直线工具 | 绘制自由线 |
| 在空白画布单击节点工具 | 拖拽以确定新节点大小 |
| 右键 | 已禁用（无上下文菜单） |

### 8.4 键盘

撤销/重做键见 [第 12 节](#12-撤销与重做)。其余：

| 键 | 行为 |
|---|---|
| `Delete` / `Backspace` | 删除选择（编辑标签时忽略） |
| `Escape` | 取消绘制、清除工具、清除选择、退出编辑 |
| 方向键 | 以一格步进微移选中节点（`Shift` 为 4 倍） |
| `Ctrl/Cmd + X` | 剪切选择 |
| `Ctrl/Cmd + C` | 复制选择 |
| `Ctrl/Cmd + V` | 粘贴（内部缓冲区优先，否则把系统剪贴板文本作为文字节点） |

`useKeyboard` 挂载一个 `window` 的 `keydown` 监听，并在卸载时移除。`Ctrl/Cmd + Z` / `Shift + Z` / `Y` 的撤销/重做以及 `Ctrl/Cmd + X/C` 由 `FlowchartContainer` 里的第二个 `window` 监听处理，以与编辑浮层共存。

### 8.5 触摸

组件通过 Pointer Events 具备触摸能力：`onPointerDown/Move/Up` 已经统一了鼠标与触摸。容器与 SVG 上的 `touch-action: none` 阻止浏览器劫持平移/缩放手势，因此单指即可平移画布，在节点上拖拽即移动节点。当前尚未实现双指捏合缩放（滚轮缩放是唯一的缩放路径）。

### 8.6 上下文菜单

当前版本没有上下文菜单；右键被抑制（`@contextmenu.prevent`），以避免画布弹出浏览器菜单。

---

## 9. 剪贴板协议

- **复制 / 剪切**：`copySelection` 把选中的节点（含 `style`）、连线（含 `style`）或自由线快照为最小 `FlowchartData` 存入 `internalClipboard`。`cutSelection` 先复制再删除。
- **粘贴（内部）**：`pasteClipboard` 通过 `idGenerator.generateId` 重新生成 id，把连线端点重映射到新节点 id，并把每个粘贴项整体偏移 `PASTE_OFFSET (30) * pasteCounter`，使重复粘贴呈对角线堆叠。它发出一份全新的 `FlowchartData`。
- **粘贴（外部）**：`window` 的 `paste` 监听处理 `Ctrl/Cmd + V`。若 `internalClipboard` 为空且系统剪贴板含纯文本，文本会成为在当前视口中心新建的 `text` 节点（超过 100 字的标签被截断）。
- **侧边栏拖拽**：节点模板也可从 `NodeSidebar` 拖出并落到画布（`@drop`），在落点的世界坐标创建节点。

---

## 10. 主题系统

主题基于**数据属性 + CSS 变量**，而非逐元素的 prop。

- `FlowchartContainer` 计算 `resolvedTheme`，在暗色时给根 `.flowchart-container` 加上 `theme-dark` 类。
- `style/theme.css` 定义了两块变量：`.flowchart-container { --fc-*: … }`（亮色）与 `.flowchart-container.theme-dark { --fc-*: … }`（暗色）。共有 60 多个变量，覆盖画布、网格、侧边栏、操作条、编辑器、节点、连线与文字节点。
- 子组件只引用 `var(--fc-*)`。少数 CSS 变量无法表达的 SVG 专属值（网格圆点颜色、箭头 marker 填充）由脚本根据 `currentTheme`（经 `useFlowchartContext` 读取）计算。

### 10.1 调色板

`utils/colorUtils.ts` 持有预设调色板：

- **节点调色板**：18 个预设色（`PRESET_COLOR_NAMES`），从 White、Light Pink 到 Light* 系列，再到 Red/Blue/Green/Orange/Purple/Cyan/Brown 与 Dark* 变体。
- **连线调色板**：15 个连线色（`EDGE_COLOR_NAMES`）。
- `contrastColor(bg)` 返回 `#000` 或 `#fff`，使节点标签在任何背景填充上都清晰可读。

要自定义，使用方在自己的样式表中于引入 `xiaodao-flowchart/style.css` 之后覆盖变量即可。节点默认填充为 `DEFAULT_COLOR`（`#FFFFFF`），连线默认描边为 `EDGE_DEFAULT_COLOR`（`#555555`）；在取色器中选择这些值时清掉显式的 `backgroundColor` / `strokeColor`，使主题默认值恢复生效。

### 10.2 依赖注入

`useFlowchartContext` 通过 Vue 的 `provide`/`inject`（`themeKey`、`localeKey`、`mobileKey`）把 `theme`、`locale`、`mobile` 暴露给每个后代。组件调用 `useFlowchartContext()` 并读取带安全默认值的 `computed`，因此即便脱离完整容器（例如在单元测试中）也能工作。

---

## 11. 响应式适配

`FlowchartContainer` 接受 `width` / `height` 属性（数字像素或 CSS 字符串）。缺省时根容器使用 `width: 100%` 与 `height: 100vh`，`canvas-area` 为 `flex: 1`，使 SVG 始终填满父级。SVG 为 `width: 100%; height: 100%`，视口尺寸在挂载时及每次 `resetView` 时从 `canvasAreaRef.clientWidth/Height` 读取。当前版本没有 `ResizeObserver`；宿主尺寸变化由 flex 布局与下一次重置/缩放交互处理。

---

## 12. 撤销与重做

`FlowchartContainer` 维护组件内的历史：

```typescript
const MAX_HISTORY = 50
const history = ref<FlowchartData[]>([])
const historyIndex = ref(-1)
```

- 一个 `watch(modelValue, …, { immediate: true, deep: true })` 在**非撤销/重做**引起的数据变更时压入一份深拷贝快照。
- `undo()` / `redo()` 在发出恢复快照前设 `suppressHistory = true`，使随后的 `watch` 不再记录这次跳转。
- 新编辑会丢弃当前指针之后的重做项（`history = history.slice(0, historyIndex + 1)`）。
- `pushHistory` 在 `history.length > MAX_HISTORY` 时剔除最旧的快照。

键盘：`Ctrl/Cmd + Z` 撤销，`Ctrl/Cmd + Shift + Z` 或 `Ctrl/Cmd + Y` 重做。

---

## 13. 扩展点与路线图

### 13.1 节点与形状

- **新节点形状**：把类型加入 `NodeType`，在 `FlowchartNode.vue` 中渲染，并可（可选）在 `useDragFromSidebar` / `NodeSidebar.vue` 中加侧边栏模板。
- **新侧边栏模板**：扩展 `useDragFromSidebar` 返回的 `SidebarNodeTemplate[]`。

### 13.2 连线

- **自定义路由**：替换 `utils/edgeRouting.ts` 中的 `computeOrthogonalWaypoints` / `buildRoundedPath`；其余层次只消费最终的 `d` 字符串。
- **逐连线样式**：`strokeColor`、`strokeWidth`、`cornerRadius` 已经支持逐连线覆盖。

### 13.3 交互

- **捏合缩放**：在 `useCanvasPanZoom.handleWheel` 之外加触摸捏合处理。
- **上下文菜单**：把当前被抑制的 `@contextmenu` 接到菜单组件。
- **多选**：`useSelection` 当前只持有一个节点 / 连线 / 自由线；可扩展为范围或框选。

### 13.4 主题与 i18n

- **新语言**：扩展 `useFlowchartI18n.ts` 中的 `messages` 与 `I18nKey` 联合。
- **自定义主题**：在引入样式表之后覆盖 `--fc-*` 变量。

### 13.5 路线图

| 阶段 | 项 | 状态 |
|---|---|---|
| 近期 | 更多节点形状（圆角矩形、六边形等） | - |
| 近期 | 多选与框选 | - |
| 近期 | 上下文菜单（节点 / 连线 / 画布） | - |
| 中期 | 触摸捏合缩放 | - |
| 中期 | 对齐到节点与对齐参考线 | - |
| 中期 | 导出 SVG / PNG | - |
| 中期 | 缩略图 | - |
| 长期 | 协同编辑（CRDT / 共享文档） | - |
| 长期 | 超大图的 Web Worker 路由 | - |

---

## 14. 开发注意事项

1. **不可变提交**：每次编辑都对整个 `FlowchartData` 深拷贝并发出全新对象。这简单且正确，但每次按键/拖拽帧都会分配整份拷贝；对超大图，基于 patch 或结构共享的模型可降低 GC 压力。
2. **单一决策者**：`FlowchartCanvas` 只发语义事件；`FlowchartContainer` 是唯一调用模型变更的地方。新增功能时请保持这一点。
3. **先转世界坐标**：在边界处就把每个指针坐标转为世界坐标（`sc()` / `screenToCanvas`），使吸附、锚点、路由都不再依赖缩放。
4. **用属性做命中测试**：在事件处理中优先用 `data-*` 属性与 `closest()` 而非手工几何。
5. **跨平台按键**：撤销/重做/剪切/复制用 `e.metaKey || e.ctrlKey` 以兼容 Mac。
6. **严格 TypeScript**：所有函数参数与返回值都带类型；库构建前会跑 `vue-tsc --noEmit`。
7. **主题走变量**：新增视觉概念时加为 `--fc-*` 变量；只有 SVG 专属值（网格圆点、marker）在脚本中计算。

---

## 15. 节点渲染

`FlowchartNode` 用原生 SVG 图元（`<rect>`、`<polygon>` 或 `<ellipse>`）绘制形状，并把**标签渲染在 `<foreignObject>` 内的 HTML `<div>` 中**。正是 `foreignObject` 实现了纯 SVG `<text>` 难以干净完成的自动换行（`word-break`、`white-space: pre-wrap`）与垂直居中。

- 当 `style.backgroundColor` 缺省时，默认填充取自主题目（亮色为 `DEFAULT_COLOR = #fff`，暗色为 `theme-dark` 的默认值）。`FlowchartContainer.onPickNodeColor` 在选择默认色时清掉 `backgroundColor` / `textColor`，使主题值恢复。
- 文字颜色用 `contrastColor(bg)` 计算，使标签在任何背景上都清晰可读。
- `AnchorPoints`（4 个连接点）与 `ResizeHandles`（选中时的 8 个手柄）作为子 SVG 组渲染；其指针目标带 `data-*` 属性供画布命中测试。
- `parallelogram` 使用 `min(15, w * 0.15)` 的斜切；`diamond` 为多边形 `(cx,top) (right,cy) (cx,bottom) (left,cy)`。

---

## 16. 锚点与连线重布线

每个节点暴露 4 个锚点（`top`、`right`、`bottom`、`left`）。`AnchorPoints` 把它们渲染为小圆点；`getAnchorDisplayPoint` 给出其屏幕位置（世界坐标，位于变换组内）用于命中测试。

- **绘制新连线**：按下锚点启动 `useEdgeDrawing`（`drawingState.active`）；`onPointerMove` 更新光标世界坐标，`FlowchartCanvas` 显示从源锚点到鼠标的虚线预览；在邻近目标锚点释放时调用 `model.addEdge`，它拒绝自连接与重复连线。在空白处释放则取消。
- **重布线已有连线**：选中连线会显示其两个端点手柄（`edge-handles-layer`）。拖拽手柄进入 `drag.type === 'edgeHandle'`；`onPointerMove` 显示虚线预览并跟踪最近锚点（`hoveredNodeId` / `hoveredAnchor`，半径约 25），`onPointerUp` 发出 `edgeReroute`，把该端点重连到新节点/锚点（绝不会连到同一连线的另一端）。
- 自由线没有锚点；它们通过拖拽端点手柄或线段整体来移动。

---

## 17. 自由线

自由线（`FreeLine`）是不挂接节点的注释笔画。它们由直线工具（`lineToolActive`）或空白画布上的 Shift+点击拖拽创建，也可从侧边栏拖出直线模板创建。`FlowchartCanvas` 把每条线渲染为一条透明加宽的 `<line>`（命中区）+ 可见描边，选中时显示两个端点手柄。移动端点或整体会发出 `freeLineMove`，`FlowchartContainer` 把它映射到 `model.moveFreeLine`。样式（`strokeColor`、`strokeWidth`）通过 `EdgeActionBar`（与连线共用）编辑。自由线位于 `FlowchartData.freeLines`，参与 v-model、复制/粘贴与撤销/重做。

---

## 18. 平移与缩放

`useCanvasPanZoom` 拥有 `viewport`（`{ panX, panY, zoom }`）。

- **滚轮缩放以光标为锚点**：`handleWheel` 通过调整 `panX/panY` 与缩放比成比例（`scale = newZoom / zoom`），使光标下的世界点保持不动。缩放被夹在 `[MIN_ZOOM=0.1, MAX_ZOOM=10]`。
- **工具栏缩放**：`zoomAtCenter` 以视口中心缩放（工具栏放大/缩小按钮使用），同样的 `ZOOM_STEP = 1.08`。
- **重置视图**：`resetView` 以 `zoom = 1` 把全部节点的包围盒居中。
- **平移夹取**：`applyPanClamp` 在内容大于视口时防止内容被整块拖出屏幕（内边距 `EDGE_PAD = 100`）。它在滚轮缩放、中心缩放与重置后都会执行。
- **拖拽平移**：`drag.type === 'pan'`（空白画布拖拽或中键）发出 `panMove`，直接写入 `viewport.panX/panY`。

所有变换都经过单一的 `<g transform="translate(panX, panY) scale(zoom)">`，因此节点、连线、自由线、手柄与文字编辑器浮层在每个缩放级别下都完美对齐。
