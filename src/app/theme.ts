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
    '--heading': '#022169',
    '--border-blue': '#DBE7F2',
    '--surface-shadow': '0 10px 30px rgba(15, 23, 42, 0.05)',
    '--workspace-wash':
      'radial-gradient(ellipse at 84% 14%, rgba(0, 114, 206, 0.10), transparent 55%), radial-gradient(ellipse at 11% 88%, rgba(2, 132, 199, 0.065), transparent 52%), linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 58%, #F3F8FD 100%)',
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
  radius: { sm: '8px', md: '10px', lg: '20px' },
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
