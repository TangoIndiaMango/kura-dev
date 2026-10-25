import {
  createTheme,
  type MantineColorsTuple,
  Button,
  TextInput,
  PasswordInput,
  NumberInput,
  Select,
  PinInput,
  Modal,
  Drawer,
  ActionIcon,
  MultiSelect,
  Autocomplete,
  Popover,
  Menu,
  Tooltip,
} from '@mantine/core'
import { ArrowDown01Icon } from 'hugeicons-react'
import { createElement } from 'react'

/** Above dialogs and sheets (z-400/450), below toasts. */
const OVERLAY_Z = 1000

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
    // Dropdowns, menus and popovers open above dialogs and sheets.
    MultiSelect: MultiSelect.extend({ defaultProps: { comboboxProps: { zIndex: OVERLAY_Z } } }),
    Autocomplete: Autocomplete.extend({ defaultProps: { comboboxProps: { zIndex: OVERLAY_Z } } }),
    Popover: Popover.extend({ defaultProps: { zIndex: OVERLAY_Z } }),
    Menu: Menu.extend({ defaultProps: { zIndex: OVERLAY_Z } }),
    Tooltip: Tooltip.extend({ defaultProps: { zIndex: OVERLAY_Z } }),
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
    Select: Select.extend({
      defaultProps: {
        radius: 'md',
        allowDeselect: false,
        checkIconPosition: 'right',
        rightSection: createElement(ArrowDown01Icon, { size: 16 }),
        rightSectionPointerEvents: 'none',
        comboboxProps: { zIndex: OVERLAY_Z },
      },
    }),
    PinInput: PinInput.extend({
      defaultProps: {
        radius: 'md',
        size: 'lg',
        type: 'number',
        placeholder: '',
      },
    }),
    TextInput: TextInput.extend({
      defaultProps: {
        radius: 'md',
      },
    }),
    PasswordInput: PasswordInput.extend({
      defaultProps: {
        radius: 'md',
      },
    }),
    NumberInput: NumberInput.extend({
      defaultProps: {
        radius: 'md',
      },
    }),
  },
})
