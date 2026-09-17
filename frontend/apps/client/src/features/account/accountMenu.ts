/** Profile hub menu — static labels only; live data comes from session / me. */
export const ACCOUNT_MENU_ITEMS = [
  {
    id: 'theme',
    title: 'Dark mode',
    subtitle: 'Instrument theme',
    toggle: true,
  },
  {
    id: 'pin',
    title: 'Change PIN',
    subtitle: 'Confirms swaps and protects your account',
  },
  {
    id: 'help',
    title: 'Help & support',
    subtitle: 'Cases, call or visit a hub',
  },
  {
    id: 'logout',
    title: 'Log out',
    subtitle: '',
    danger: true,
  },
] as const
