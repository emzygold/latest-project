// Snapwall brand tokens. Swap these when the final logo colours are in.
export const colors = {
  ink: '#14121F',
  inkSoft: '#4A4759',
  muted: '#8C8899',
  paper: '#FAF6F0',
  card: '#FFFFFF',
  line: '#E8E2D8',
  accent: '#FF5B2E',
  accentSoft: '#FFE4DA',
  teal: '#12B5A6',
  danger: '#D93B3B',
  night: '#0B0A12',
};

export const radius = { sm: 10, md: 16, lg: 24, pill: 999 };

export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };

export const type = {
  display: { fontSize: 34, fontWeight: '800' as const, letterSpacing: -0.8, color: colors.ink },
  title: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.3, color: colors.ink },
  body: { fontSize: 16, color: colors.inkSoft, lineHeight: 22 },
  label: { fontSize: 13, fontWeight: '600' as const, color: colors.muted, letterSpacing: 0.4 },
};
