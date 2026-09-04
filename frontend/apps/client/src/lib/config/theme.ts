import { createTheme, type MantineColorsTuple, Button, TextInput, PasswordInput, NumberInput, Select, Modal, Drawer, ActionIcon } from '@mantine/core'

export const themeColors = {
  primaryGreen: '#0D7C8F',
  sidebarActiveGreen: '#2FBECF',
  lightGreenBg: '#0D7C8F1A',
} as const

// KURA Teal brand palette
const brand: MantineColorsTuple = [
  '#E6F7F9',
  '#C1EDF2',
  '#96E1E9',
  '#65D2DD',
  '#2FBECF',
  '#0D7C8F', // Core Kura Teal
  '#0B6B7C',
  '#095765',
  '#07444F',
  '#042E36',
]

const amber: MantineColorsTuple = [
  '#FFF8EB',
  '#FEEDCE',
  '#FCDAA0',
  '#FAC46E',
  '#F8B042',
  '#F5A623',
  '#D78E18',
  '#B3730F',
  '#8E590A',
  '#6C4105',
]

const emerald: MantineColorsTuple = [
  '#E9FAF1',
  '#C9F4DC',
  '#9DECBE',
  '#6AE19D',
  '#3ED67E',
  '#27AE60',
  '#209652',
  '#197D43',
  '#136335',
  '#0C4926',
]

export const theme = createTheme({
  primaryColor: 'brand',
  fontFamily: '"Plus Jakarta Sans", system-ui, -apple-system, sans-serif',
  headings: {
    fontFamily: '"Plus Jakarta Sans", system-ui, -apple-system, sans-serif',
    fontWeight: '700',
  },
  colors: {
    brand,
    amber,
    emerald,
  },
  defaultRadius: 'md',
  components: {
    Button: Button.extend({
      defaultProps: {
        radius: 'md',
      },
    }),
    ActionIcon: ActionIcon.extend({
      defaultProps: {
        radius: 'md',
      },
    }),
    Modal: Modal.extend({
      defaultProps: {
        radius: 'lg',
        overlayProps: {
          backgroundOpacity: 0.7,
          blur: 4,
        },
      },
    }),
    Drawer: Drawer.extend({
      defaultProps: {
        overlayProps: {
          backgroundOpacity: 0.6,
          blur: 4,
        },
      },
    }),
  },
})
