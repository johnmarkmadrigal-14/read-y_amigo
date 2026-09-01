// theme/tokens.ts
// Bold, high-contrast palette for a kids' voice-reading app — inspired by
// brands like Jollibee that use saturated primary colors kids can name on
// sight (red, yellow, blue, green, orange), rather than blended pastels.

export interface Theme {
  colors: {
    background: string;
    surface: string;
    primary: string;
    primaryText: string;
    primaryShadow: string;
    secondary: string;
    secondaryText: string;
    secondaryShadow: string;
    highlight: string;
    text: string;
    textMuted: string;
    border: string;
    success: string;
    successText: string;
    retry: string;
    retryText: string;
    accentBlue: string;
    accentGreen: string;
    accentOrange: string;
  };
}

export const lightTheme: Theme = {
  colors: {
    background: '#FFFFFF',      // clean white — lets red/yellow pop, high energy
    surface: '#FFF8E6',         // warm pale yellow, cards / input boxes
    primary: '#D71920',         // bold red — main buttons, logo text, links
    primaryText: '#FFFFFF',
    primaryShadow: '#A10F14',   // darker shade for "sticker" button shadow
    secondary: '#FFC72C',       // bold gold-yellow — secondary buttons, badges
    secondaryText: '#4A2E00',
    secondaryShadow: '#D69A00',
    highlight: '#FFE066',       // word highlight for read-along
    text: '#3A2A1E',            // warm near-black, not pure black
    textMuted: '#8A7A6A',
    border: '#FFE3A3',
    success: '#34A853',         // "nice job!" feedback — bright, nameable green
    successText: '#1E7A34',
    retry: '#FF8A00',           // gentle "try again" — bright orange, not red
    retryText: '#B85E00',
    accentBlue: '#2E9DF7',      // extra nameable color: badges, levels, avatars
    accentGreen: '#34A853',
    accentOrange: '#FF8A00',
  },
};

export const darkTheme: Theme = {
  colors: {
    background: '#241A12',
    surface: '#3A2A1E',
    primary: '#FF5A5F',
    primaryText: '#241A12',
    primaryShadow: '#B8383D',
    secondary: '#FFD966',
    secondaryText: '#241A12',
    secondaryShadow: '#CBA83E',
    highlight: '#FFE066',
    text: '#FBEFE3',
    textMuted: '#C7AF9E',
    border: '#4E3A28',
    success: '#5FCB7E',
    successText: '#1E3D24',
    retry: '#FFA24D',
    retryText: '#4A2B10',
    accentBlue: '#6DBBFF',
    accentGreen: '#5FCB7E',
    accentOrange: '#FFA24D',
  },
};

export const spacing = {
  xs: -5,     // was -5 — fixed. Negative margin was pulling logo/subtitle together.
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 24,
  full: 999,
} as const;

export const typography = {
  display: {
    sm: { fontFamily: 'Fredoka_500Medium', fontSize: 14 },
    md: { fontFamily: 'Fredoka_500Medium', fontSize: 18 },
    lg: { fontFamily: 'Fredoka_600SemiBold', fontSize: 24 },
    xl: { fontFamily: 'Fredoka_700Bold', fontSize: 35, letterSpacing: 0.5 },
  },
  reading: {
    sm: { fontFamily: 'AtkinsonHyperlegible_400Regular', fontSize: 16, lineHeight: 26 },
    md: { fontFamily: 'AtkinsonHyperlegible_400Regular', fontSize: 20, lineHeight: 32 },
    lg: { fontFamily: 'AtkinsonHyperlegible_700Bold', fontSize: 24, lineHeight: 36 },
  },
} as const;