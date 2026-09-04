import { createTheme, type MantineColorsTuple, Button, TextInput, PasswordInput, NumberInput, Select, Modal, Drawer, ActionIcon } from '@mantine/core'

export const themeColors = {
  primaryGreen: '#0D7C8F',
  sidebarActiveGreen: '#2FBECF',
  lightGreenBg: '#0D7C8F1A',
} as const

const brand: MantineColorsTuple = [
  '#E6F7F9',
  '#C1EDF2',
  '#96E1E9',
  '#65D2DD',
  '#2FBECF',
  '#0D7C8F',
  '#0B6B7C',
  '#095765',
  '#07444F',
  '#042E36',
]

const navy: MantineColorsTuple = [
  '#E6EDF2',
  '#C2D3E0',
  '#97B4CB',
  '#6893B3',
  '#43779F',
  '#003153',
  '#002B49',
  '#00243E',
  '#001C30',
  '#001321',
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
    navy,
  },
  defaultRadius: 'md',
  components: {
    Button: Button.extend({
      defaultProps: {
        radius: 'md',
      },
    }),
    Modal: Modal.extend({
      defaultProps: {
        radius: 'lg',
        overlayProps: {
          backgroundOpacity: 0.5,
          blur: 3,
        },
      },
    }),
  },
})
