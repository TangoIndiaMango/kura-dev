import {
  createTheme,
  type MantineColorsTuple,
  Button,
  TextInput,
  PasswordInput,
  NumberInput,
  Select,
  MultiSelect,
  Autocomplete,
  TagsInput,
  Popover,
  Menu,
  Tooltip,
  Modal,
  Drawer,
  ActionIcon,
} from '@mantine/core'
import { ArrowDown01Icon } from 'hugeicons-react'
import { createElement } from 'react'

/** Above our dialogs (z-400), below toasts (9999). */
const OVERLAY_Z = 1000

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
    ActionIcon: ActionIcon.extend({
      defaultProps: {
        radius: 'md',
      },
    }),
    TextInput: TextInput.extend({
      defaultProps: {
        radius: 'md',
      },
    }),
    Select: Select.extend({
      defaultProps: {
        radius: 'md',
        rightSection: createElement(ArrowDown01Icon, { size: 16 }),
        rightSectionPointerEvents: 'none',
        comboboxProps: { zIndex: OVERLAY_Z },
      },
    }),
    // Dropdowns, menus and popovers open above our dialogs (KuraIllustrationModal
    // and sheets sit at z-400; Mantine's default 300 hid options behind them).
    MultiSelect: MultiSelect.extend({ defaultProps: { comboboxProps: { zIndex: OVERLAY_Z } } }),
    Autocomplete: Autocomplete.extend({ defaultProps: { comboboxProps: { zIndex: OVERLAY_Z } } }),
    TagsInput: TagsInput.extend({ defaultProps: { comboboxProps: { zIndex: OVERLAY_Z } } }),
    Popover: Popover.extend({ defaultProps: { zIndex: OVERLAY_Z } }),
    Menu: Menu.extend({ defaultProps: { zIndex: OVERLAY_Z } }),
    Tooltip: Tooltip.extend({ defaultProps: { zIndex: OVERLAY_Z } }),
    Modal: Modal.extend({
      defaultProps: {
        radius: 'md',
        overlayProps: {
          backgroundOpacity: 0.5,
          blur: 3,
        },
      },
    }),
    Drawer: Drawer.extend({
      defaultProps: {
        overlayProps: {
          backgroundOpacity: 0.4,
          blur: 2,
        },
      },
    }),
  },
})
