import type { Locale } from '../types'

type I18nKey =
  | 'sidebar.title'
  | 'node.defaultColor'
  | 'node.delete'
  | 'edge.defaultColor'
  | 'edge.delete'
  | 'template.rectangle'
  | 'template.diamond'
  | 'template.ellipse'
  | 'template.parallelogram'
  | 'template.text'

const messages: Record<Locale, Record<I18nKey, string>> = {
  'zh-CN': {
    'sidebar.title': '节点',
    'node.defaultColor': '默认颜色',
    'node.delete': '删除节点',
    'edge.defaultColor': '默认颜色',
    'edge.delete': '删除连线',
    'template.rectangle': '矩形',
    'template.diamond': '菱形',
    'template.ellipse': '椭圆',
    'template.parallelogram': '平行四边形',
    'template.text': '文字',
  },
  'en-US': {
    'sidebar.title': 'Nodes',
    'node.defaultColor': 'Default color',
    'node.delete': 'Delete node',
    'edge.defaultColor': 'Default color',
    'edge.delete': 'Delete edge',
    'template.rectangle': 'Rectangle',
    'template.diamond': 'Diamond',
    'template.ellipse': 'Ellipse',
    'template.parallelogram': 'Parallelogram',
    'template.text': 'Text',
  },
}

export function createI18n(locale: Locale) {
  return {
    t(key: I18nKey): string {
      return messages[locale]?.[key] ?? key
    },
  }
}