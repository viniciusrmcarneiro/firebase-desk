export interface ThemeTokens {
  readonly color: {
    readonly bg: {
      readonly app: string;
      readonly panel: string;
      readonly panelSubtle: string;
      readonly elevated: string;
      readonly overlay: string;
      readonly inverse: string;
    };
    readonly text: {
      readonly primary: string;
      readonly secondary: string;
      readonly muted: string;
      readonly disabled: string;
      readonly inverse: string;
      readonly brand: string;
      readonly danger: string;
      readonly warning: string;
      readonly success: string;
    };
    readonly border: {
      readonly subtle: string;
      readonly default: string;
      readonly strong: string;
      readonly focus: string;
      readonly danger: string;
      readonly warning: string;
    };
    readonly action: {
      readonly primary: string;
      readonly primaryHover: string;
      readonly primaryActive: string;
      readonly secondary: string;
      readonly secondaryHover: string;
      readonly ghostHover: string;
      readonly selected: string;
      readonly selectedHover: string;
    };
    readonly status: {
      readonly productionBg: string;
      readonly productionText: string;
      readonly productionBorder: string;
      readonly emulatorBg: string;
      readonly emulatorText: string;
      readonly emulatorBorder: string;
      readonly successBg: string;
      readonly successText: string;
      readonly successBorder: string;
      readonly warningBg: string;
      readonly warningText: string;
      readonly warningBorder: string;
      readonly dangerBg: string;
      readonly dangerText: string;
      readonly dangerBorder: string;
    };
  };
}

export const lightTheme = {
  color: {
    bg: {
      app: '#F8FAFC',
      panel: '#FFFFFF',
      panelSubtle: '#F1F5F9',
      elevated: '#FFFFFF',
      overlay: 'rgba(15, 23, 42, 0.42)',
      inverse: '#0F172A',
    },
    text: {
      primary: '#0F172A',
      secondary: '#475569',
      muted: '#64748B',
      disabled: '#94A3B8',
      inverse: '#FFFFFF',
      brand: '#0B2558',
      danger: '#991B1B',
      warning: '#92400E',
      success: '#166534',
    },
    border: {
      subtle: '#E2E8F0',
      default: '#CBD5E1',
      strong: '#94A3B8',
      focus: '#FF7A00',
      danger: '#FCA5A5',
      warning: '#FDE68A',
    },
    action: {
      primary: '#FF7A00',
      primaryHover: '#F06C00',
      primaryActive: '#D85F00',
      secondary: '#FFFFFF',
      secondaryHover: '#F1F5F9',
      ghostHover: '#F1F5F9',
      selected: '#FFF4E8',
      selectedHover: '#FFE7CC',
    },
    status: {
      productionBg: '#FEF2F2',
      productionText: '#991B1B',
      productionBorder: '#FCA5A5',
      emulatorBg: '#ECFDF5',
      emulatorText: '#166534',
      emulatorBorder: '#86EFAC',
      successBg: '#ECFDF5',
      successText: '#166534',
      successBorder: '#86EFAC',
      warningBg: '#FFFBEB',
      warningText: '#92400E',
      warningBorder: '#FDE68A',
      dangerBg: '#FEF2F2',
      dangerText: '#991B1B',
      dangerBorder: '#FCA5A5',
    },
  },
} as const satisfies ThemeTokens;

export const darkTheme = {
  color: {
    bg: {
      app: '#020617',
      panel: '#0F172A',
      panelSubtle: '#111C2F',
      elevated: '#172033',
      overlay: 'rgba(2, 6, 23, 0.72)',
      inverse: '#FFFFFF',
    },
    text: {
      primary: '#F8FAFC',
      secondary: '#CBD5E1',
      muted: '#94A3B8',
      disabled: '#64748B',
      inverse: '#0F172A',
      brand: '#FFB21F',
      danger: '#FCA5A5',
      warning: '#FDE68A',
      success: '#86EFAC',
    },
    border: {
      subtle: '#1E293B',
      default: '#334155',
      strong: '#475569',
      focus: '#FF9A00',
      danger: '#7F1D1D',
      warning: '#78350F',
    },
    action: {
      primary: '#FF7A00',
      primaryHover: '#FF8E1A',
      primaryActive: '#E06400',
      secondary: '#172033',
      secondaryHover: '#1E293B',
      ghostHover: '#1E293B',
      selected: 'rgba(255, 122, 0, 0.16)',
      selectedHover: 'rgba(255, 122, 0, 0.22)',
    },
    status: {
      productionBg: 'rgba(153, 27, 27, 0.22)',
      productionText: '#FCA5A5',
      productionBorder: '#7F1D1D',
      emulatorBg: 'rgba(22, 101, 52, 0.22)',
      emulatorText: '#86EFAC',
      emulatorBorder: '#166534',
      successBg: 'rgba(22, 101, 52, 0.22)',
      successText: '#86EFAC',
      successBorder: '#166534',
      warningBg: 'rgba(146, 64, 14, 0.22)',
      warningText: '#FDE68A',
      warningBorder: '#78350F',
      dangerBg: 'rgba(153, 27, 27, 0.22)',
      dangerText: '#FCA5A5',
      dangerBorder: '#7F1D1D',
    },
  },
} as const satisfies ThemeTokens;

export const themes = {
  light: lightTheme,
  dark: darkTheme,
} as const satisfies Record<string, ThemeTokens>;

export type ThemeName = keyof typeof themes;
export type AppearanceMode = 'system' | ThemeName;
export type AppearanceThemeName = 'firebase-desk-default';

export interface AppearanceSettings {
  readonly mode: AppearanceMode;
  readonly theme: AppearanceThemeName;
}

export const defaultAppearanceSettings: AppearanceSettings = {
  mode: 'system',
  theme: 'firebase-desk-default',
};
