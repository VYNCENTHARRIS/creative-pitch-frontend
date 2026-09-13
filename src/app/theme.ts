import {
  AppShell,
  Badge,
  Button,
  createTheme,
  Drawer,
  Paper,
  type CSSVariablesResolver,
} from '@mantine/core'

const fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'

// Resolve scheme colors here so Mantine's generated variables keep the intended palette.
export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {
    '--text': '#0F172A',
    '--muted': '#64748B',
    '--border': '#E2E8F0',
  },
  light: {
    '--mantine-color-body': '#F8FAFC',
    '--mantine-color-text': 'var(--text)',
    '--mantine-color-dimmed': 'var(--muted)',
    '--mantine-color-default-color': 'var(--text)',
    '--mantine-color-default-border': 'var(--border)',
  },
  dark: {},
})

export const theme = createTheme({
  primaryColor: 'brand',
  primaryShade: 7,
  colors: {
    brand: [
      '#EDF5FC',
      '#D9EAF8',
      '#BAD7F0',
      '#91BDE3',
      '#6BA3D6',
      '#3C83BF',
      '#1565AA',
      '#004990',
      '#003C77',
      '#002D59',
    ],
  },
  fontFamily,
  headings: { fontFamily, fontWeight: '650' },
  defaultRadius: 'md',
  radius: { sm: '6px', md: '10px', lg: '14px' },
  focusRing: 'auto',
  respectReducedMotion: true,
  components: {
    AppShell: AppShell.extend({
      styles: { header: { backgroundColor: 'var(--mantine-color-white)' } },
    }),
    Drawer: Drawer.extend({
      styles: {
        content: { backgroundColor: 'var(--mantine-color-white)' },
        header: { backgroundColor: 'var(--mantine-color-white)' },
      },
    }),
    Button: Button.extend({ defaultProps: { size: 'md', fw: 600 } }),
    Badge: Badge.extend({ defaultProps: { radius: 'sm', tt: 'none', fw: 600 } }),
    Paper: Paper.extend({ defaultProps: { withBorder: true, shadow: undefined, bg: 'white' } }),
  },
})
