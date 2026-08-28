# xiaodao-flowchart

[中文](./README.ZH.md) | **English** | [Demo](https://xiaodaozhi.com/xiaodao-flowchart.html)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Vue 3](https://img.shields.io/badge/Vue-3.3+-42b883.svg)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-~6-3178C6.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.0+-646CFF.svg)](https://vitejs.dev/)
[![Downloads](https://img.shields.io/npm/d18m/xiaodao-flowchart)](https://www.npmjs.com/package/xiaodao-flowchart)

一个自包含的 Vue 3 流程图组件，可在浏览器中直接绘制流程图与示意图。它提供完整的编辑体验，包含多种节点形状、智能正交连线、画布平移/缩放、内联文本编辑、撤销/重做、主题切换与国际化，同时以单一的 `v-model` 数据源驱动，保持数据单向可控。所有内容均以清晰的 SVG 渲染，在任意缩放下都保持锐利。

![Preview](./img/preview.png)

---

## 目录

- [功能特性](#功能特性)
- [安装](#安装)
- [快速开始](#快速开始)
- [基础用法](#基础用法)
- [Props](#props)
- [Events](#events)
- [数据模型](#数据模型)
- [架构设计](#架构设计)
- [键盘快捷键](#键盘快捷键)
- [连线路由算法](#连线路由算法)
- [主题定制](#主题定制)
- [国际化](#国际化)
- [构建](#构建)
- [路线图](#路线图)
- [技术栈](#技术栈)
- [许可证](#许可证)

---

## 功能特性

### 核心

- **5 种节点类型**：矩形、菱形、椭圆、平行四边形，以及自由文本节点。全部支持拖拽、缩放、内联标签编辑与自定义样式。
- **智能正交连线**：自动正交路径布线，支持多段折线、节点自我避让，以及绕开第三方节点。
- **可拖拽的连线端点**：选中连线后会显示可拖拽的源/目标端点手柄，可重新连接到其他节点（改接）。
- **自由线**：在画布上绘制独立的连接线（不依赖节点），其端点可选中、可移动。
- **节点侧边栏**：将节点模板从侧边栏拖拽到画布即可创建节点；响应式布局（移动端自动收起）。
- **8 向缩放**：选中节点后显示 8 个缩放手柄，带比例约束与最小尺寸限制。
- **内联文本编辑**：双击节点进入编辑模式，支持多行文本。
- **预设调色板**：节点 18 色 + 连线 15 色，并自动计算文字对比色（黑/白）。
- **浅色 / 深色主题**：基于 60+ 个 CSS 自定义属性（`--fc-*`），通过 `theme` 属性切换。
- **国际化**：内置中文（`zh-CN`）与英文（`en-US`），通过 `locale` 属性切换。
- **撤销 / 重做**：对图数据做完整快照（最多 50 步）。
- **剪切 / 复制 / 粘贴**：针对节点、连线、自由线的内部剪贴板，并支持从系统剪贴板粘贴纯文本（在视口中心创建文本节点）。
- **`v-model` 数据驱动**：单一数据源，通过 `update:modelValue` 事件双向绑定。

### 交互

- **画布控制**：鼠标滚轮缩放（0.1x 至 10x）、右键/中键拖拽平移，以及自适应的多级点阵网格。
- **节点拖拽与缩放**：自由拖拽节点；8 个缩放手柄带比例约束与最小尺寸限制。
- **连线绘制**：从节点锚点拖拽到另一节点或锚点即可创建连线；悬停连线会显示可拖拽端点手柄用于改接。
- **自由线绘制**：使用侧边栏的直线工具绘制独立连接线，随后可拖拽其端点。
- **选择**：单击选中节点/连线/自由线，单击画布取消选择，使用方向键微移。
- **侧边栏拖拽创建**：将节点模板从侧边栏拖到画布（响应式，移动端自动收起）。
- **键盘快捷键**：撤销/重做、剪切/复制/粘贴、删除、方向键微移（Shift 加速 4 倍）、Escape 取消。
- **触摸与移动端**：`mobile` 属性会收起侧边栏并优化触摸交互。

### 视觉

- **浅色 / 深色主题**：通过 60+ 个 CSS 自定义属性提供完整调色板。
- **国际化**：开箱支持中文与英文，所有工具栏与提示文案自动本地化。
- **SVG 渲染**：纯 SVG 画布，使用单一世界坐标变换组，在任意缩放下都保持清晰。
- **预设调色板**：节点 18 色、连线 15 色，并自动计算对比色。

---

## 安装

```bash
# pnpm（推荐）
pnpm add xiaodao-flowchart

# npm
npm install xiaodao-flowchart

# yarn
yarn add xiaodao-flowchart
```

引入组件及其样式表：

```ts
import FlowchartContainer from 'xiaodao-flowchart'
import 'xiaodao-flowchart/style.css'
```

### 对等依赖

- `vue` `^3.3.0`

---

## 快速开始

```bash
# 克隆仓库
git clone https://github.com/xiaodaozhi/xiaodao-flowchart.git
cd xiaodao-flowchart

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

打开 `http://localhost:5173` 即可查看演示应用（`src/App.vue`）。

---

## 基础用法

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
    { id: 'n1', type: 'rectangle', x: 80, y: 80, width: 160, height: 60, label: '开始' },
    { id: 'n2', type: 'diamond', x: 80, y: 220, width: 160, height: 80, label: '判断?' },
  ],
  edges: [
    { id: 'e1', sourceNodeId: 'n1', sourceAnchor: 'bottom', targetNodeId: 'n2', targetAnchor: 'top' },
  ],
})
</script>
```

---

## Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|---------|-------------|
| `modelValue`（v-model） | `FlowchartData` | `[]` | 图数据，通过 `v-model` 双向绑定。 |
| `theme` | `'light' \| 'dark'` | `'light'` | 主题模式。 |
| `locale` | `'zh-CN' \| 'en-US'` | `'zh-CN'` | 内置文案的语言。 |
| `mobile` | `boolean` | `false` | 移动端模式：收起侧边栏并优化触摸交互。 |
| `width` | `string \| number` | `100%` | 容器宽度（数字按像素处理）。 |
| `height` | `string \| number` | `100%` / `100vh` | 容器高度（数字按像素处理）。 |

---

## Events

| 事件 | 载荷 | 说明 |
|------|------|-------------|
| `update:modelValue` | `FlowchartData` | 每次数据变化时触发（即 `v-model` 载荷）。 |
| `nodeSelect` | `string \| null` | 选中的节点 id，取消选择时为 `null`。 |
| `nodeDblClick` | `string` | 双击节点时返回的节点 id（进入内联编辑）。 |
| `edgeSelect` | `string \| null` | 选中的连线 id，取消选择时为 `null`。 |

---

## 数据模型

### `FlowchartData`

用于 `v-model` 双向绑定的外部数据格式：

```typescript
interface FlowchartData {
  nodes: FlowchartNode[]
  edges: FlowchartEdge[]
  freeLines?: FreeLine[]
}
```

- **`nodes`**：图节点数组。
- **`edges`**：节点之间的连线数组。
- **`freeLines`**：可选的独立连接线，不依附于节点。

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

### 类型导出

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

所有模型与样式类型均已导出，供外部使用。

---

## 架构设计

```src/
├── main.ts                            # 演示入口
├── App.vue                            # 演示应用（同时也是 build:demo 的入口）
└── components/
    └── flowchart/
        ├── index.ts                   # 库入口：组件与类型的统一导出（barrel）
        ├── FlowchartContainer.vue     # 根组件：工具栏 + 侧边栏 + 画布 + 事件
        ├── FlowchartCanvas.vue        # SVG 画布：渲染 + 统一指针事件分发
        ├── FlowchartNode.vue          # 节点形状渲染（SVG + foreignObject 标签）
        ├── FlowchartEdge.vue          # 连线正交路由 + 箭头标记
        ├── NodeSidebar.vue            # 侧边栏拖拽源（节点/直线模板）
        ├── NodeActionBar.vue          # 节点取色器
        ├── EdgeActionBar.vue          # 连线 / 自由线取色器
        ├── composables/
        │   ├── useFlowchartContext.ts  # theme / locale / mobile 的 provide/inject 键
        │   ├── useFlowchartModel.ts    # v-model 存储、不可变提交、历史记录
        │   ├── useFlowchartI18n.ts     # i18n 文案映射（zh-CN / en-US）
        │   ├── useCanvasPanZoom.ts      # 平移/缩放数学、滚轮处理、屏幕<->世界坐标
        │   ├── useEdgeDrawing.ts        # 连线拖拽状态机
        │   ├── useSelection.ts          # 选择状态
        │   ├── useDragFromSidebar.ts    # 侧边栏节点拖拽创建
        │   └── useKeyboard.ts           # 键盘快捷键
        ├── style/
        │   └── theme.css                # CSS 自定义属性（60+ 个 --fc-* 变量）
        └── utils/
            ├── anchorUtils.ts          # 锚点几何
            ├── geometry.ts             # 网格吸附与点运算
            ├── colorUtils.ts           # 预设调色板 + 对比度计算
            └── idGenerator.ts          # Id 生成（nanoid）
```

### 设计原则

- **单一数据源（`v-model`）**：`useFlowchartModel` 持有数据。每次修改都会生成新的不可变 `FlowchartData` 并发射 `update:modelValue`，父组件始终持有权威状态。
- **SVG + 单一世界坐标变换**：一个 `<g transform="translate(panX, panY) scale(zoom)">` 包含全部图内容（节点、连线、自由线、手柄）。平移与缩放仅更新该变换，绝不逐元素重算位置。
- **智能正交路由**：连线自动避开源/目标节点本身，并绕开第三方节点；复杂场景回退到基于网格的 Dijkstra 最短路径搜索。
- **主题用 CSS 变量驱动**：60+ 个 `--fc-*` 自定义属性通过 `provide`/`inject` 注入；切换 `theme` 属性即可整体换肤。
- **i18n 通过 `provide`/`inject`**：内置 `zh-CN` 与 `en-US` 映射，由 `locale` 属性切换。
- **组合式 API + 单一职责 composable**：每个关注点（模型、选择、平移缩放、连线绘制、键盘）各自独立成 composable，共享一个小上下文。
- **撤销 / 重做**:对完整 `FlowchartData` 做快照（最多 50 步）驱动历史。
- **网格吸附**：网格尺寸随当前缩放级别自适应，编辑更顺手。

---

## 键盘快捷键

### 编辑

| 按键 | 动作 |
|------|--------|
| `双击` / `Enter` | 进入选中节点的内联文本编辑 |
| `Escape` | 取消编辑、连线绘制或当前选择 |
| `Delete` / `Backspace` | 删除选中的节点、连线或自由线 |

### 剪贴板与历史

| 按键 | 动作 |
|------|--------|
| `Ctrl/Cmd+C` | 复制所选内容（节点 / 连线 / 自由线） |
| `Ctrl/Cmd+X` | 剪切所选内容 |
| `Ctrl/Cmd+V` | 粘贴（内部剪贴板，或外部纯文本转为文本节点） |
| `Ctrl/Cmd+Z` | 撤销 |
| `Ctrl/Cmd+Y` / `Ctrl/Cmd+Shift+Z` | 重做 |

### 画布与选择

| 按键 | 动作 |
|------|--------|
| `方向键` | 微移选中节点（1 个网格步长） |
| `Shift + 方向键` | 快速微移选中节点（4 倍网格步长） |
| `鼠标滚轮` | 以光标为中心缩放 |
| `右键 / 中键拖拽` | 平移画布 |

---

## 连线路由算法

连线路由器会在两个节点锚点之间构建正交（直角）折线。

- **基础路径构造**：根据源/目标锚点方向自动选择 L 形、Z 形或 U 形折线。
- **节点自我避让**：路径生成时自动避开源节点与目标节点本身。
- **第三方节点绕行**：检测路径是否会穿过其他节点，并生成绕行折线。
- **基于网格的路径搜索**：针对复杂场景，构建网格图并使用带转弯惩罚的 Dijkstra 最短路径搜索。
- **路径清理**：自动合并共线线段、去除重复相邻点。
- **圆角处理**：`buildRoundedPath` 生成平滑的圆角（默认 `cornerRadius` 为 8）。

---

## 主题定制

### CSS 变量注入

主题色以 `--fc-` 为前缀的 CSS 自定义属性注入：

```css
--fc-bg, --fc-grid-bg, --fc-grid-line, --fc-selection-bg,
--fc-node-fill, --fc-node-border, --fc-node-text,
--fc-edge-stroke, --fc-sidebar-bg, --fc-sidebar-border,
--fc-bar-bg, --fc-toolbar-bg,
/* ... 以及更多 */
```

### 自定义主题

传入 `theme="dark"` 启用深色模式，或包裹组件并覆盖 CSS 变量进行完全自定义：

```vue
<template>
  <div style="--fc-bg: #1a1a2e; --fc-node-text: #e0e0e0;">
    <FlowchartContainer v-model="data" theme="dark" />
  </div>
</template>
```

### 国际化

内置语言：`'zh-CN'` 与 `'en-US'`。通过 `locale` 属性切换；工具栏标签、提示与右键菜单会自动本地化。

---

## 构建

```bash
# 仅类型检查
pnpm typecheck

# 生产库构建（类型检查 + vite 构建 + 生成 d.ts）
pnpm build

# 演示构建（普通应用构建，输出到 dist-demo）
pnpm build:demo

# 预览生产构建
pnpm preview
```

### 构建产物

| 文件 | 说明 |
|------|-------------|
| `dist/xiaodao-flowchart.es.js` | ES 模块（供打包工具使用） |
| `dist/xiaodao-flowchart.umd.cjs` | UMD 包（供直接 `<script>` 引入） |
| `dist/xiaodao-flowchart.css` | 提取的样式表 |
| `dist/types/` | TypeScript 类型声明文件 |

`build:demo` 脚本会将独立演示应用输出到 `dist-demo/`，该目录与 `dist/` 一样被 git 忽略。

### CI/CD

项目包含 GitHub Actions 工作流（`.github/workflows/publish.yml`），用于自动发布到 npm。

---

## 路线图

### 近期

- [x] 5 种节点类型（矩形、菱形、椭圆、平行四边形、文本）
- [x] 智能正交连线，含节点避让与绕行
- [x] 自由线及可拖拽的连线改接
- [x] 撤销/重做、剪切/复制/粘贴
- [x] 浅色/深色主题与 i18n（zh-CN、en-US）
- [ ] 导出为 PNG / SVG
- [ ] 缩略图 / 总览导航

### 中期

- [ ] 多选与成组移动
- [ ] 对齐参考线与智能吸附
- [ ] 连线标签的丰富定位
- [ ] 子图 / 容器节点

### 远期

- [ ] 自定义节点渲染器的插件系统
- [ ] 协同编辑

---

## 技术栈

| 层 | 技术 | 版本 |
|----|------|------|
| 框架 | Vue 3（组合式 API + `<script setup>`） | `^3.3`（peer）、`^3.5`（dev） |
| 构建 | Vite | `^8` |
| 语言 | TypeScript（strict） | `~6` |
| 类型检查 | vue-tsc | `^3` |
| 渲染 | SVG 2D（单一世界坐标变换） | - |
| 包管理器 | pnpm / npm | - |
| CSS | 作用域 CSS + CSS 自定义属性 | - |

---

## 许可证

本项目基于 MIT 许可证开源，详见 [LICENSE](LICENSE) 文件。
