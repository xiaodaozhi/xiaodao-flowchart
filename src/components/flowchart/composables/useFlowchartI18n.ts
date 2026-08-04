import type { Locale } from '../types';
import { PRESET_COLOR_NAMES, EDGE_COLOR_NAMES } from '.././utils/colorUtils';

type I18nKey
  = | 'sidebar.title'
    | 'node.defaultColor'
    | 'node.delete'
    | 'edge.defaultColor'
    | 'edge.delete'
    | 'toolbar.undo'
    | 'toolbar.redo'
    | 'toolbar.resetView'
    | 'sidebar.freeLine'
    | 'template.rectangle'
    | 'template.diamond'
    | 'template.ellipse'
    | 'template.parallelogram'
    | 'template.text'
    | 'color.white'
    | 'color.lightPink'
    | 'color.lightPurple'
    | 'color.lavender'
    | 'color.periwinkle'
    | 'color.lightBlue'
    | 'color.lightCyan'
    | 'color.lightTeal'
    | 'color.lightGreen'
    | 'color.lightLime'
    | 'color.lightYellow'
    | 'color.lightAmber'
    | 'color.lightOrange'
    | 'color.lightRed'
    | 'color.lightBrown'
    | 'color.lightBlueGrey'
    | 'color.lightGrey'
    | 'color.blueGrey'
    | 'color.darkGrey'
    | 'color.red'
    | 'color.blue'
    | 'color.green'
    | 'color.orange'
    | 'color.purple'
    | 'color.cyan'
    | 'color.brown'
    | 'color.darkBlue'
    | 'color.darkRed'
    | 'color.darkGreen'
    | 'color.darkOrange'
    | 'color.darkPurple'
    | 'color.amber';

const messages: Record<Locale, Record<I18nKey, string>> = {
  'zh-CN': {
    'sidebar.title': '节点',
    'toolbar.undo': '撤销',
    'toolbar.redo': '重做',
    'toolbar.resetView': '重置视图',
    'sidebar.freeLine': '直线',
    'node.defaultColor': '默认颜色',
    'node.delete': '删除节点',
    'edge.defaultColor': '默认颜色',
    'edge.delete': '删除连线',
    'template.rectangle': '矩形',
    'template.diamond': '菱形',
    'template.ellipse': '椭圆',
    'template.parallelogram': '平行四边形',
    'template.text': '文字',
    'color.white': '白色',
    'color.lightPink': '浅粉',
    'color.lightPurple': '浅紫',
    'color.lavender': '薰衣草',
    'color.periwinkle': '长春花',
    'color.lightBlue': '浅蓝',
    'color.lightCyan': '浅青',
    'color.lightTeal': '浅蓝绿',
    'color.lightGreen': '浅绿',
    'color.lightLime': '浅黄绿',
    'color.lightYellow': '浅黄',
    'color.lightAmber': '浅琥珀',
    'color.lightOrange': '浅橙',
    'color.lightRed': '浅红',
    'color.lightBrown': '浅棕',
    'color.lightBlueGrey': '浅蓝灰',
    'color.lightGrey': '浅灰',
    'color.blueGrey': '蓝灰',
    'color.darkGrey': '深灰',
    'color.red': '红色',
    'color.blue': '蓝色',
    'color.green': '绿色',
    'color.orange': '橙色',
    'color.purple': '紫色',
    'color.cyan': '青色',
    'color.brown': '棕色',
    'color.amber': '琥珀',
    'color.darkBlue': '深蓝',
    'color.darkRed': '深红',
    'color.darkGreen': '深绿',
    'color.darkOrange': '深橙',
    'color.darkPurple': '深紫',
  },
  'en-US': {
    'sidebar.title': 'Nodes',
    'toolbar.undo': 'Undo',
    'toolbar.redo': 'Redo',
    'toolbar.resetView': 'Reset view',
    'sidebar.freeLine': 'Line',
    'node.defaultColor': 'Default color',
    'node.delete': 'Delete node',
    'edge.defaultColor': 'Default color',
    'edge.delete': 'Delete edge',
    'template.rectangle': 'Rectangle',
    'template.diamond': 'Diamond',
    'template.ellipse': 'Ellipse',
    'template.parallelogram': 'Parallelogram',
    'template.text': 'Text',
    'color.white': 'White',
    'color.lightPink': 'Light Pink',
    'color.lightPurple': 'Light Purple',
    'color.lavender': 'Lavender',
    'color.periwinkle': 'Periwinkle',
    'color.lightBlue': 'Light Blue',
    'color.lightCyan': 'Light Cyan',
    'color.lightTeal': 'Light Teal',
    'color.lightGreen': 'Light Green',
    'color.lightLime': 'Light Lime',
    'color.lightYellow': 'Light Yellow',
    'color.lightAmber': 'Light Amber',
    'color.lightOrange': 'Light Orange',
    'color.lightRed': 'Light Red',
    'color.lightBrown': 'Light Brown',
    'color.lightBlueGrey': 'Light Blue Grey',
    'color.lightGrey': 'Light Grey',
    'color.blueGrey': 'Blue Grey',
    'color.darkGrey': 'Dark Grey',
    'color.red': 'Red',
    'color.blue': 'Blue',
    'color.green': 'Green',
    'color.orange': 'Orange',
    'color.purple': 'Purple',
    'color.cyan': 'Cyan',
    'color.brown': 'Brown',
    'color.amber': 'Amber',
    'color.darkBlue': 'Dark Blue',
    'color.darkRed': 'Dark Red',
    'color.darkGreen': 'Dark Green',
    'color.darkOrange': 'Dark Orange',
    'color.darkPurple': 'Dark Purple',
  },
};

export function createI18n(locale: Locale) {
  return {
    t(key: I18nKey): string {
      return messages[locale]?.[key] ?? key;
    },
    colorName(hex: string, isDefault: boolean): string {
      if (isDefault) return this.t('node.defaultColor');
      const key = PRESET_COLOR_NAMES[hex] ?? EDGE_COLOR_NAMES[hex];
      return key ? messages[locale]?.[key as I18nKey] ?? hex : hex;
    },
  };
}
