<template>
  <Transition name="bar">
    <div
      v-if="visible"
      class="node-action-bar"
    >
      <div
        ref="barRef"
        class="bar-inner"
      >
        <!-- Left scroll arrow -->
        <button
          class="scroll-arrow scroll-left"
          :class="{ invisible: !showLeftArrow }"
          @click="scrollColors(-1)"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <!-- Scrollable color row -->
        <div
          ref="scrollRef"
          class="color-scroll"
        >
          <div class="color-row">
            <button
              v-for="c in colors"
              :key="c"
              class="color-btn"
              :class="{ 'active': c === activeColor, 'is-default': c === defaultColor }"
              :style="{ backgroundColor: c }"
              :title="c === defaultColor ? i18n.colorName(c, true) : i18n.colorName(c, false)"
              @click="$emit('pickColor', c)"
            >
              <!-- Default color: no icon, just dashed border -->
            </button>
          </div>
        </div>

        <!-- Right scroll arrow -->
        <button
          class="scroll-arrow scroll-right"
          :class="{ invisible: !showRightArrow }"
          @click="scrollColors(1)"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        <!-- Separator -->
        <div class="separator" />

        <!-- Delete button -->
        <button
          class="delete-btn"
          :title="i18n.t('node.delete')"
          @click="$emit('delete')"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue';
import './style/theme.css';
import { PRESET_COLORS, DEFAULT_COLOR } from './utils/colorUtils';
import { useFlowchartContext } from './composables/useFlowchartContext';
import { createI18n } from './composables/useFlowchartI18n';

const props = defineProps<{
  visible: boolean;
  currentColor: string;
}>();

defineEmits<{
  pickColor: [color: string];
  delete: [];
}>();

const { locale } = useFlowchartContext();
const i18n = computed(() => createI18n(locale));

const colors = PRESET_COLORS;
const defaultColor = DEFAULT_COLOR;

const activeColor = computed(() => {
  const c = props.currentColor;
  if (!c || c === defaultColor) return defaultColor;
  return c;
});

const scrollRef = ref<HTMLElement | null>(null);
const barRef = ref<HTMLElement | null>(null);
const showLeftArrow = ref(false);
const showRightArrow = ref(false);

function checkArrows() {
  const el = scrollRef.value;
  if (!el) { showLeftArrow.value = false; showRightArrow.value = false; return; }
  showLeftArrow.value = el.scrollLeft > 1;
  showRightArrow.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
}

function scrollColors(dir: number) {
  const el = scrollRef.value;
  if (!el) return;
  el.scrollBy({ left: el.clientWidth * 0.8 * dir, behavior: 'smooth' });
}

// Use ResizeObserver + scroll listener for robust arrow detection
let observer: ResizeObserver | null = null;

watch(() => props.visible, async (v) => {
  if (v) {
    await nextTick();
    checkArrows();
    const el = scrollRef.value;
    if (el) {
      el.addEventListener('scroll', checkArrows, { passive: true });
      observer = new ResizeObserver(checkArrows);
      observer.observe(el);
      // Also observe bar to catch initial render
      if (barRef.value) observer.observe(barRef.value);
    }
  } else {
    const el = scrollRef.value;
    if (el) el.removeEventListener('scroll', checkArrows);
    if (observer) { observer.disconnect(); observer = null; }
  }
});
</script>

<style scoped>
.node-action-bar {
  position: absolute;
  bottom: 10px;
  left: 10px;
  right: 10px;
  display: flex;
  justify-content: center;
  z-index: 200;
  pointer-events: none;
}

.bar-inner {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--fc-bar-bg);
  border-radius: 4px;
  padding: 8px 12px;
  box-shadow: var(--fc-bar-shadow);
  pointer-events: auto;
  max-width: calc(100vw - 170px);
  width: fit-content;
}

.color-scroll {
  overflow: hidden;
  padding: 4px 4px;
}

.color-row {
  display: flex;
  gap: 4px;
  align-items: center;
  flex-wrap: nowrap;
}

.scroll-arrow {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--fc-bar-scroll-arrow);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 0;
  transition: color 0.15s, background 0.15s, visibility 0.15s;
}

.scroll-arrow.invisible {
  visibility: hidden;
  pointer-events: none;
}

.scroll-arrow:hover {
  color: var(--fc-bar-scroll-arrow-hover);
  background: var(--fc-bar-scroll-arrow-hover-bg);
}

.color-btn {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid var(--fc-bar-color-btn-border);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  flex-shrink: 0;
  transition: border-color 0.15s, transform 0.15s;
}

.color-btn:hover {
  border-color: var(--fc-bar-color-btn-border-hover);
  transform: scale(1.15);
}

.color-btn.active {
  border-color: var(--fc-bar-color-btn-border-active);
  border-width: 3px;
}

.color-btn.is-default {
  border-style: dashed;
  background: transparent !important;
}

.separator {
  width: 1px;
  height: 24px;
  background: var(--fc-bar-separator);
  flex-shrink: 0;
}

.delete-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--fc-bar-delete);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: color 0.15s, background 0.15s;
}

.delete-btn:hover {
  color: var(--fc-bar-delete-hover);
  background: var(--fc-bar-delete-hover-bg);
}

/* Transition */
.bar-enter-active,
.bar-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.bar-enter-from,
.bar-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
