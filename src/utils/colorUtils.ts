/** 10 preset colors */
export const PRESET_COLORS = [
  '#FFFFFF', '#F8BBD0', '#E1BEE7', '#D1C4E9', '#C5CAE9',
  '#BBDEFB', '#B2EBF2', '#B2DFDB', '#C8E6C9', '#F0F4C3',
  '#FFF9C4', '#FFECB3', '#FFE0B2', '#FFCCBC', '#D7CCC8',
  '#CFD8DC', '#E0E0E0', '#B0BEC5',
]

/** Default / reset color key */
export const DEFAULT_COLOR = '#FFFFFF'

/** Edge stroke color presets (darker / more saturated, suitable for lines). */
export const EDGE_PRESET_COLORS = [
  '#555555', '#E53935', '#1E88E5', '#43A047', '#FB8C00',
  '#8E24AA', '#00ACC1', '#6D4C41', '#546E7A', '#FFB300',
  '#3949AB', '#C62828', '#2E7D32', '#F4511E', '#5E35B1',
]

export const EDGE_DEFAULT_COLOR = '#555555'

/** Decide text color (black or white) based on background luminance. */
export function contrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.55 ? '#000000' : '#FFFFFF'
}
