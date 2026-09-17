export const ACCOUNT_MOCK = {
  initials: 'YA',
  name: 'Yusuf Abdullahi',
  kuraId: 'KR-482100',
  phone: '+234 803 412 1000',
  verifiedLabel: 'NIN verified',
  savedVsPetrolNaira: 86400,
  savedSince: 'since March',
  swapsCompleted: 312,
  swapsPerWeek: '5.6 per week',
  menu: [
    {
      id: 'vehicles',
      title: 'My vehicles',
      subtitle: '2 vehicles · fleet features on',
    },
    {
      id: 'engine',
      title: 'Stored petrol engine',
      subtitle: 'Yamaha 15HP · ENG-IGB-103 · HULL-IGB-14',
    },
    {
      id: 'payments',
      title: 'Payment methods',
      subtitle: 'Virtual account · card ••4F2A',
    },
    {
      id: 'theme',
      title: 'Dark mode',
      subtitle: 'On · instrument theme',
      toggle: true,
    },
    {
      id: 'pin',
      title: 'Change PIN',
      subtitle: 'Last changed Jun 2026',
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
  ],
  vehicles: [
    {
      id: 'v1',
      name: 'Spiro E-Moto',
      status: 'Active',
      rows: [
        { label: 'Registration', value: 'LSR-482-XA' },
        { label: 'Battery type', value: 'Spiro Moto 48V' },
        { label: 'Plan', value: 'Monthly' },
        { label: 'Last swap', value: 'Today 07:02' },
      ],
    },
    {
      id: 'v2',
      name: 'Asobo E-Boarder 15',
      status: 'Active',
      rows: [
        { label: 'Hull no', value: 'HULL-IGB-14' },
        { label: 'Battery type', value: 'Asobo Marine 72V' },
        { label: 'Plan', value: 'Weekly' },
        { label: 'Stored engine', value: 'ENG-IGB-103' },
      ],
    },
  ],
  engine: {
    adminId: 'ENG-03',
    name: 'Yamaha 15HP',
    status: 'Stored',
    code: 'ENG-IGB-103',
    hull: 'HULL-IGB-14',
    hub: 'Igbokoda Marine Waterfront Hub',
    storedSince: 'Apr 2, 2026',
    condition: 'Good',
    rows: [
      { label: 'Engine ID', value: 'ENG-IGB-103' },
      { label: 'Hull', value: 'HULL-IGB-14' },
      { label: 'Hub', value: 'Igbokoda Waterfront' },
      { label: 'Stored', value: 'Apr 2, 2026' },
      { label: 'Condition', value: 'Good' },
    ],
    intakePhotoUrl:
      'https://images.unsplash.com/photo-1565043589221-1a6fd9ae45c7?w=960&h=720&fit=crop&auto=format',
    note: 'Your petrol engine is held as collateral while you use the e-boarder. Request a return and ops will schedule retrieval.',
  },
  payments: {
    virtualAccount: {
      bank: 'Wema Bank',
      nuban: '9012 3456 78',
      name: 'KURA / YUSUF ABDULLAHI',
    },
    card: {
      brand: 'Verve',
      last4: '4F2A',
      expiry: '08/28',
    },
  },
  help: {
    phone: '+234 700 000 5872',
    chatHours: '06:00–22:00 daily',
    hubsNote:
      'Visit any open hub for PIN reset, SIM change, face check, or manual ID verification if your KYC is still pending.',
  },
}
