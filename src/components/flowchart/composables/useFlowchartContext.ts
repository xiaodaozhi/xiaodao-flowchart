import { computed, inject, type InjectionKey, type Ref } from 'vue';
import type { Theme, Locale } from '../types';

export const themeKey: InjectionKey<Ref<Theme>> = Symbol('theme');
export const localeKey: InjectionKey<Ref<Locale>> = Symbol('locale');
export const mobileKey: InjectionKey<Ref<boolean>> = Symbol('mobile');

export function useFlowchartContext() {
  const theme = inject(themeKey);
  const locale = inject(localeKey);
  const mobile = inject(mobileKey);

  return {
    theme: computed(() => theme?.value ?? ('light' as Theme)),
    locale: computed(() => locale?.value ?? ('zh-CN' as Locale)),
    mobile: computed(() => mobile?.value ?? false),
  };
}
