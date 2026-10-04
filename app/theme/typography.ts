// Modular type scale (1.25 ratio). Minimum body text is 16pt.

export const typography = {
  display: { fontSize: 32, lineHeight: 40, fontWeight: '700' as const },
  h1: { fontSize: 24, lineHeight: 32, fontWeight: '700' as const },
  h2: { fontSize: 20, lineHeight: 28, fontWeight: '700' as const },
  h3: { fontSize: 18, lineHeight: 24, fontWeight: '600' as const },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' as const },
  bodyBold: { fontSize: 16, lineHeight: 24, fontWeight: '700' as const },
  bodySmall: { fontSize: 14, lineHeight: 20, fontWeight: '400' as const },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' as const },
  overline: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 1.2,
  },
} as const;

export type TypographyVariant = keyof typeof typography;
