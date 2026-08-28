# xiaodao-flowchart（小刀流程图）

> 一个使用 **Vue 3 + TypeScript + Vite** 构建的纯前端、可交互流程图编辑器组件。

`xiaodao-flowchart` 是一个自包含的 Vue 3 组件，可在浏览器中直接绘制流程图。它提供完整的编辑体验——多种节点形状、智能正交连线、画布平移/缩放、内联文本编辑、撤销/重做、主题切换与国际化——同时以单一的 `v-model` 数据源驱动，保持数据单向可控。

![预览](./img/preview.png)

---

## 目录

- [功能特性](#功能特性)
- [技术栈](#技术栈)
- [安装](#安装)
- [脚本命令](#脚本命令)
- [使用示例](#使用示例)
- [Props 属性](#props-属性)
- [Events 事件](#events-事件)
- [数据结构](#数据结构)
- [项目结构](#项目结构)
- [交互指南](#交互指南)
- [连线路由算法](#连线路由算法)
- [主题定制](#主题定制)
- [国际化](#国际化)
- [键盘快捷键](#键盘快捷键)
- [浏览器兼容性](#浏览器兼容性)
- [许可证](#许可证)

---

## 功能特性

- **5 种节点类型** —— 矩形、菱形、椭圆、平行四边形，以及自由文本节点。全部支持拖拽、缩放、内联标签编辑与自定义样式。
- **智能正交连线** —— 自动正交路径布线，支持多段折线、节点自我避让，以及绕开第三方节点。
- **可拖拽的连线端点** —— 选中连线后会显示可拖拽的源/目标端点手柄，可重新连接到其他节点（改接）。
- **自由线** —— 在画布上绘制独立的连接线（不依赖节点），其端点可选中、可移动。
- **画布控制** —— 鼠标滚轮缩放（0.1× – 10×）、右键/中键拖拽平移，以及自适应的多级点阵网格。
- **节点侧边栏** —— 将节点模板从侧边栏拖拽到画布即可创建节点；响应式布局（移动端自动收起）。
- **8 向缩放** —— 选中节点后显示 8 个缩放手柄，带比例约束与最小尺寸限制。
- **内联文本编辑** —— 双击节点进入编辑模式，支持多行文本。
- **浅色 / 深色主题** —— 基于 CSS 自定义属性（60+ 变量覆盖所有 UI 元素），通过 `theme` 属性切换。
- **国际化** —— 内置中文（`zh-CN`）与英文（`en-US`），通过 `locale` 属性切换。
- **预设调色板** —— 节点 18 色 + 连线 15 色，并自动计算文字对比色（黑/白）。
- **键盘快捷键** —— 撤销/重做（`Ctrl+Z`/`Y`）、剪切/复制/粘贴（`Ctrl+X`/`C`/`V`）、`Delete`/`Backspace` 删除、方向键微移（`Shift` 加速 4 倍）、`Escape` 取消。
- **外部文本粘贴** —— 从系统剪贴板粘贴纯文本，可在视口中心创建一个文本节点。
- **`v-model` 数据驱动** —— 单一数据源，通过 `update:modelValue` 事件双向绑定。
- **完整 TypeScript 覆盖** —— 类型定义完整，composable 与模型类型均已导出供外部使用。

---

## 技术栈

| 技术        | 版本      |
|-------------|-----------|
| Vue         | ^3.5.40   |
| TypeScript  | ~6.0.2    |
| Vite        | ^8.2.0    |
| nanoid      | ^5.1.16   |

---

## 安装

从 npm（或你使用的镜像源）安装：

```bash
npm install xiaodao-flowchart
```

`vue` 是**对等依赖**（`^3.3.0`），请确保你的项目中已安装。

> 组件样式请从 `xiaodao-flowchart/style.css` 引入（见[使用示例](#使用示例)）。

### 本地开发

从仓库克隆后运行演示/开发服务器：

```bash
npm install
npm run dev
```

---

## 脚本命令

| 脚本                  | 说明                                                          |
|-----------------------|---------------------------------------------------------------|
| `npm run dev`         | 启动 Vite 开发服务器（演示页 = `index.html` → `App.vue`）。    |
| `npm run build`       | 类型检查，将**库**打包到 `dist/`，并生成 `.d.ts` 类型声明。     |
| `npm run build:demo`  | 将独立演示**应用**（含 `App.vue`）打包到 `dist-demo/`。         |
| `npm run preview`     | 通过 `vite preview` 预览已构建的演示。                         |
| `npm run typecheck`   | 仅运行 `vue-tsc` 类型检查。                                    |

`dist/`（库产物）与 `dist-demo/`（演示产物）均已被 git 忽略。

---

## 使用示例

```vue
<template>
  <FlowchartContainer
    v-model="data"
    theme="light"
    locale="zh-CN"
    @node-select="onNodeSelect"
    @node-dbl-click="onNodeDblClick"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { FlowchartContainer } from 'xiaodao-flowchart'
import 'xiaodao-flowchart/style.css'
import type { FlowchartData } from 'xiaodao-flowchart'

const data = ref<FlowchartData>({
  nodes: [
    { id: 'start', type: 'rectangle', x: 200, y: 150, width: 160, height: 80, label: '开始', style: { backgroundColor: '#E8F5E9' } },
    { id: 'decision', type: 'diamond', x: 220, y: 320, width: 120, height: 120, label: '条件判断?', style: { backgroundColor: '#FFF3E0' } },
    { id: 'end', type: 'ellipse', x: 200, y: 680, width: 160, height: 100, label: '结束', style: { backgroundColor: '#F3E5F5' } },
  ],
  edges: [
    { id: 'e1', sourceNodeId: 'start', sourceAnchor: 'bottom', targetNodeId: 'decision', targetAnchor: 'top' },
    { id: 'e2', sourceNodeId: 'decision', sourceAnchor: 'bottom', targetNodeId: 'end', targetAnchor: 'top' },
  ],
  // freeLines?: FreeLine[] —— 可选的自由线（独立连接线）
})

function onNodeSelect(nodeId: string | null) { /* ... */ }
function onNodeDblClick(nodeId: string) { /* ... */ }
</script>
```

> 若要在本地从源码（而非 npm 包）使用该组件，请从相对源码路径引入，例如 `import { FlowchartContainer } from './components/flowchart'`。

---

## Props 属性

| 属性         | 类型                          | 默认值    | 说明                                               |
|--------------|-------------------------------|-----------|----------------------------------------------------|
| `modelValue` | `FlowchartData`               | —         | 流程图数据，使用 `v-model` 双向绑定。               |
| `theme`      | `'light' \| 'dark'`           | `'light'` | 颜色主题。                                         |
| `locale`     | `'zh-CN' \| 'en-US'`          | `'zh-CN'` | UI 语言。                                          |
| `mobile`     | `boolean`                     | `false`   | 移动端模式——收起侧边栏并优化触摸交互。             |
| `width`      | `string \| number`            | —         | 容器宽度（数字按像素处理），默认 `100%`。           |
| `height`     | `string \| number`            | —         | 容器高度（数字按像素处理），默认 `100%`/`100vh`。   |

---

## Events 事件

| 事件                | 载荷                      | 说明                              |
|---------------------|---------------------------|-----------------------------------|
| `update:modelValue` | `FlowchartData`           | 数据发生变化时触发。              |
| `nodeSelect`        | `nodeId: string \| null`  | 节点被选中（`null` 表示取消选中）。|
| `nodeDblClick`      | `nodeId: string`          | 节点被双击（进入编辑模式）。      |
| `edgeSelect`        | `edgeId: string \| null`  | 连线被选中（`null` 表示取消选中）。|

---

## 数据结构

所有类型均从包根导出，例如 `import type { FlowchartData, FlowchartNode, ... } from 'xiaodao-flowchart'`。

### `FlowchartData`

```typescript
interface FlowchartData {
  nodes: FlowchartNode[]
  edges: FlowchartEdge[]
  freeLines?: FreeLine[]   // 可选的自由线（独立连接线）
}
```

### `FlowchartNode`

```typescript
type NodeType = 'rectangle' | 'diamond' | 'ellipse' | 'parallelogram' | 'text'

interface NodeStyle {
  backgroundColor?: string
  borderColor?: string
  borderWidth?: number
  textColor?: string
  fontSize?: number
  borderRadius?: number
  opacity?: number
}

interface FlowchartNode {
  id: string
  type: NodeType
  x: number
  y: number
  width: number
  height: number
  label: string
  style?: NodeStyle
}
```

若省略 `style.backgroundColor`，节点填充色将根据当前主题（浅色/深色）推导；文字颜色通过对比度自动计算。

### `FlowchartEdge`

```typescript
type AnchorPosition = 'top' | 'right' | 'bottom' | 'left'

interface EdgeStyle {
  strokeColor?: string
  strokeWidth?: number
  cornerRadius?: number
}

interface FlowchartEdge {
  id: string
  sourceNodeId: string
  sourceAnchor: AnchorPosition
  targetNodeId: string
  targetAnchor: AnchorPosition
  label?: string
  style?: EdgeStyle
}
```

### `FreeLine`

```typescript
interface FreeLineStyle {
  strokeColor?: string
  strokeWidth?: number
}

interface FreeLine {
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
  style?: FreeLineStyle
}
```

### 导出的常量

以下常量可用于构建 UI 或应用默认值：

```typescript
import {
  DEFAULT_NODE_STYLE,   // Required<NodeStyle>
  DEFAULT_EDGE_STYLE,   // Required<EdgeStyle>
  DEFAULT_FREE_LINE_STYLE,
  MIN_NODE_WIDTH, MIN_NODE_HEIGHT,
  MIN_ZOOM, MAX_ZOOM, ZOOM_STEP,
  GRID_SIZE, BASE_GRID_SIZE,
} from 'xiaodao-flowchart'
```

---

## 项目结构

```
src/
├── main.ts                              # 应用入口
├── App.vue                              # 演示页（设置浏览器页面标题）
├── style.css                            # 全局样式重置
└── components/flowchart/
    ├── index.ts                         # 组件与类型导出
    ├── FlowchartContainer.vue           # 顶层容器（状态编排）
    ├── FlowchartCanvas.vue              # SVG 画布（核心交互 + 渲染）
    ├── FlowchartNode.vue                # 节点渲染（5 种形状 + 标签）
    ├── FlowchartEdge.vue                # 连线渲染（正交路由）
    ├── NodeSidebar.vue                  # 节点模板侧边栏
    ├── AnchorPoints.vue                 # 锚点控件
    ├── ResizeHandles.vue                # 缩放手柄（8 向）
    ├── TextNodeEditor.vue               # 内联文本编辑器
    ├── NodeActionBar.vue                # 节点操作栏（取色器）
    ├── EdgeActionBar.vue                # 连线 / 自由线操作栏（取色器）
    ├── types/
    │   └── index.ts                    # 全部类型定义与常量
    ├── utils/
    │   ├── anchorUtils.ts              # 锚点位置计算
    │   ├── colorUtils.ts               # 颜色预设与对比度
    │   ├── edgeRouting.ts              # 正交路径路由引擎
    │   ├── geometry.ts                 # 几何工具函数
    │   └── idGenerator.ts              # 唯一 ID 生成（nanoid）
    ├── composables/
    │   ├── useFlowchartModel.ts        # 数据模型 CRUD
    │   ├── useCanvasPanZoom.ts         # 画布平移与缩放
    │   ├── useEdgeDrawing.ts           # 连线绘制状态机
    │   ├── useDragFromSidebar.ts       # 侧边栏拖拽创建
    │   ├── useKeyboard.ts              # 键盘快捷键
    │   ├── useSelection.ts             # 选中状态管理
    │   ├── useFlowchartContext.ts      # 依赖注入（主题 / 语言 / 移动端）
    │   └── useFlowchartI18n.ts         # 国际化
    └── style/
        └── theme.css                   # 主题 CSS 自定义属性
```

各模块如何协作的深入说明，请参阅 **[DOC.ZH.md](./DOC.ZH.md)**。

---

## 交互指南

| 操作            | 方式                                                       |
|-----------------|------------------------------------------------------------|
| 创建节点        | 从左侧侧边栏拖拽模板到画布                                 |
| 创建节点（工具）| 在侧边栏激活节点工具，然后在画布上拖拽                     |
| 移动节点        | 拖拽节点                                                   |
| 缩放节点        | 拖拽 8 个缩放手柄之一                                      |
| 编辑文本        | 双击节点                                                   |
| 创建连线        | 从源节点锚点拖拽到目标节点锚点                             |
| 改接连线        | 选中连线后拖拽其端点手柄                                   |
| 绘制自由线      | 激活直线工具（或在空白处 `Shift`+拖拽）                     |
| 选中节点/连线   | 单击                                                       |
| 删除            | 选中后按 `Delete` / `Backspace`、`Ctrl+X`，或点击删除按钮  |
| 修改颜色        | 选中后点击底部操作栏中的颜色按钮                           |
| 撤销 / 重做     | `Ctrl+Z` / `Ctrl+Shift+Z` 或 `Ctrl+Y`（macOS 为 ⌘）        |
| 剪切 / 复制 / 粘贴 | `Ctrl+X` / `Ctrl+C` / `Ctrl+V`（macOS 为 ⌘）             |
| 粘贴外部文本    | `Ctrl+V` 且未复制流程图内容时 → 创建文本节点              |
| 平移画布        | 在空白处右键拖拽或中键拖拽                                 |
| 缩放画布        | 鼠标滚轮                                                   |
| 微移节点        | 方向键（按住 `Shift` 加速 4 倍）                           |
| 取消操作        | `Escape`                                                   |

---

## 连线路由算法

组件实现了一套完整的正交连线路由引擎（`utils/edgeRouting.ts`）：

- **基础路径构造** —— 根据源/目标锚点方向自动选择 L 形、Z 形或 U 形折线。
- **节点自我避让** —— 路径生成时自动避开源节点与目标节点本身。
- **第三方节点绕行** —— 检测路径是否会穿过其他节点，并生成绕行折线。
- **基于网格的路径搜索** —— 针对复杂场景，构建网格图并使用带转弯惩罚的 Dijkstra 最短路径搜索。
- **路径清理** —— 自动合并共线线段、去除重复相邻点。
- **圆角处理** —— `buildRoundedPath` 生成平滑的圆角（默认 `cornerRadius` 为 8）。

箭头以「按颜色」的 SVG `<marker>` 定义渲染（每种描边颜色一个 marker），可在包括 iOS Safari 在内的浏览器中正常工作。

---

## 主题定制

主题系统通过 60+ 个 CSS 自定义属性（前缀 `--fc-*`）实现，覆盖画布、侧边栏、操作栏、编辑器、节点、连线与网格。浅色与深色变量集定义在 `style/theme.css` 中，并通过容器上的 `.theme-dark` 类切换。

若要创建自定义主题，请在引入 `xiaodao-flowchart/style.css` **之后**，在你的样式表中覆盖相应 CSS 自定义属性：

```css
/* 示例：为画布背景着色 */
.xiaodao-flowchart .flowchart-container {
  --fc-canvas-bg: #f0f4ff;
}
```

> 节点默认填充色与文字颜色也会随主题自动适配；仅在你希望完全自定义外观时才覆盖它们。

---

## 国际化

UI 文案位于 `composables/useFlowchartI18n.ts`，包含完整的 `zh-CN` 与 `en-US` 文案映射。通过 `locale` 属性切换当前语言：

```vue
<FlowchartContainer v-model="data" locale="en-US" />
```

颜色名称（用于操作栏提示）也会本地化。若要新增语言，请扩展 `useFlowchartI18n.ts` 中的 `messages` 记录与 `I18nKey` 联合类型。

---

## 键盘快捷键

| 快捷键                 | 作用                                     |
|------------------------|------------------------------------------|
| `Ctrl/Cmd + Z`         | 撤销                                     |
| `Ctrl/Cmd + Shift + Z` | 重做                                     |
| `Ctrl/Cmd + Y`         | 重做                                     |
| `Ctrl/Cmd + X`         | 剪切选中的节点 / 连线 / 自由线           |
| `Ctrl/Cmd + C`         | 复制选中项                               |
| `Ctrl/Cmd + V`         | 粘贴（或粘贴外部文本为节点）             |
| `Delete` / `Backspace` | 删除选中项                               |
| 方向键                 | 微移选中节点（1 格）                      |
| `Shift` + 方向键       | 微移选中节点（4 格）                      |
| `Escape`               | 取消当前绘制 / 选中状态                   |

撤销/重做维护一个 `FlowchartData` 的历史栈（最多 50 个快照）。

---

## 浏览器兼容性

支持所有现代浏览器（Chrome、Firefox、Safari、Edge）。基于 **SVG + CSS 自定义属性 + Pointer Events API** 构建。通过 `mobile` 属性支持触摸交互。

---

## 许可证

[MIT](./LICENSE)
