export const density = {
  compact: {
    controlHeight: 28,
    rowHeight: 28,
    treeRowHeight: 28,
    tabHeight: 32,
    toolbarHeight: 36,
    panelPadding: 8,
    iconSize: 16,
  },
  comfortable: {
    controlHeight: 34,
    rowHeight: 36,
    treeRowHeight: 34,
    tabHeight: 38,
    toolbarHeight: 44,
    panelPadding: 12,
    iconSize: 18,
  },
} as const;

export type DensityName = keyof typeof density;

export const defaultDensity: DensityName = 'compact';
