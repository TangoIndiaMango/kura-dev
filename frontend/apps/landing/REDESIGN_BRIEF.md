# KURA landing page — redesign brief

You are a senior product designer, head of UX and frontend engineer in one. Turn
`frontend/apps/landing` (a working React 19 + Vite 8 + Tailwind 4 single page)
into a marketing site that looks and feels properly designed, is accurate about
what KURA does today, and ships production-ready. Judge every decision by the
rider on a mid-range Android phone, outdoors, on a patchy connection.

## Context you must respect

- **What KURA is:** 60-second EV battery swaps at solar hubs in Nigeria for okada
  (motorcycle), keke (tricycle) and boat operators, plus fleet owners.
- **What riders can actually do today:** sign up with phone + PIN, add vehicles,
  see hubs with live ready-pack counts, reserve a pack and pay ahead with
  Paystack (card, transfer, USSD) or walk in and pay cash at the hub, pay per swap
  or on a daily/weekly/monthly plan, get a receipt for every swap. Unused paid
  bookings are refunded to how they paid, after review.
- **What KURA does NOT do (never claim it):** rider wallet or balance, top-ups,
  airtime, bills, loans or credit, SMS confirmations, "first swap free",
  percentage fleet discounts, testimonials from real people (none exist yet).
- **Live data:** `GET {VITE_API_BASE_URL}/public/network/` returns `hubs`
  (name, address, status ready|low|offline, ready_count, hours_label, lat, lng),
  `plans` (vehicle_type, name, period swap|day|week|month, price_kobo,
  swap_allowance, duration_days) and `pay_per_swap_kobo` by vehicle type. Every
  price, hub and count on the site comes from here. If it fails, the page still
  reads well and says "see prices in the app"; never hard-code prices.
- **Links:** rider app = `VITE_APP_URL`; WhatsApp = `VITE_WHATSAPP_NUMBER`
  (wa.me with a prefilled message per context); USSD only if `VITE_USSD_CODE`.
- **Brand:** keep the KURA mark (`/brand/kura-mark-circle.png`), cream paper,
  near-black ink, petrol teal, sun gold. You may refine these values; keep the
  identity.

## Design direction

1. **Typography.** Replace all-caps Bebas everywhere. Use one variable family
   with a width axis (preferred: **Archivo** from Google Fonts, `wdth` 62–125):
   condensed heavy for one or two hero-level statements only, normal width for
   headings and body. Mixed case, defined type scale (clamp-based), tabular
   figures for money, small caps text never below 12px, body ≥ 16px. Self-host
   or preload the font; `font-display: swap`.
2. **Navigation.** Floating compact bar that tightens on scroll, active-section
   indicator (IntersectionObserver), one primary CTA ("Get started") and a quiet
   "Sign in", theme toggle. Mobile: full-screen sheet, large targets (≥ 48px),
   focus trapped, Esc closes, body scroll locked.
3. **Layout rhythm.** Stop repeating "bordered row" sections. Use: hero with
   live "N hubs open now" chip (pulsing dot) + phone mock-up of the booking pass
   (code + QR, built in HTML/SVG, not a screenshot); 3-step "how it works" with
   custom SVG illustrations; who-rides cards; bento grid for features; savings
   calculator; **plan cards** per vehicle with a highlighted best value and a
   per-day equivalent; **hubs = map + list** (Leaflet + OpenStreetMap tiles,
   lazy-loaded, markers coloured by status, "Get directions" deep link to Google
   Maps); fleets; **FAQ** (accordion, ≥ 8 real questions: running out of charge,
   paying, refunds, hub out of packs, lost/damaged pack, plans vs pay-per-swap,
   fleets, data/privacy); closing CTA; footer.
4. **Motion.** Add **Lenis** smooth scroll (anchor links go through Lenis with
   the nav offset). Staggered reveal for section headings and cards only, subtle
   image parallax, count-up for live numbers, marquee that pauses on hover/focus.
   One easing curve and duration scale for everything. With
   `prefers-reduced-motion`: no Lenis, no parallax, no count-up, instant reveals.
5. **Light and dark mode.** Design tokens as CSS variables for both themes;
   follow the system by default, toggle in the nav, remember the choice
   (localStorage, wrapped in try/catch), no flash on load (inline script in
   `index.html` sets the theme before paint). Check every section, image and
   illustration in both. WCAG AA contrast in both.
6. **Imagery.** Consistent treatment across all photos (same crop ratios,
   grading, optional subtle grain). Use only images you are licensed to use:
   the existing `/public/images` photos, or **free-licence photos from Unsplash or
   Pexels** of Nigerian/West African riders, keke, boats, solar and charging.
   Download them, record source URL, photographer and licence in
   `public/images/CREDITS.md`. Never use images from Google Images search. Serve
   AVIF/WebP with JPEG fallback, `srcset` + `sizes`, explicit width/height,
   lazy-load below the fold, ≤ 200 KB per above-the-fold image.
   **Illustrations:** draw your own SVG set (swap handover, battery pack, hub,
   phone pass, map pin) in one line style, coloured with theme tokens.

## Pages and footer

- Multi-page Vite build (or a tiny router) with real URLs: `/`, `/privacy`,
  `/terms`, `/contact`. Each has its own title, description and canonical URL.
- **Footer:** logo + one-line mission; columns Product (How it works, Pricing,
  Hubs, Fleets, FAQ), Company (Contact, Privacy, Terms), Get in touch (emails,
  WhatsApp, address); social links only if provided; © year + legal name.
- **Contact page:** emails by purpose (general, support, fleets/partnerships,
  privacy), WhatsApp, address, hours; a form only if there is a backend to send
  it (otherwise mailto/WhatsApp).
- **Privacy and Terms:** draft from what the system really collects and does
  (phone, name, ID documents for verification, vehicle details, location for hub
  distance, payments via Paystack, swap and battery records, notifications),
  aligned with the **Nigeria Data Protection Act 2023**. Mark both clearly
  "Draft — pending legal review" until a lawyer signs off. Do not invent company
  facts; use the values provided below.

## Engineering bar

- Keep files under 300 lines; match the existing code style; no new
  dependencies beyond Lenis, Leaflet and the font unless justified.
- Pre-render the pages to static HTML at build time for SEO (e.g. a prerender
  step) so content is in the HTML without JavaScript.
- JSON-LD: `Organization` and one `LocalBusiness` per live hub.
- Performance budget on mobile (Lighthouse, throttled): Performance ≥ 90,
  Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 95; LCP < 2.5s; CLS < 0.05;
  JS < 120 KB gzipped on first load (lazy-load the map).
- Accessibility: semantic landmarks, skip link, visible focus, keyboard-operable
  everything (tabs, accordion, menu, toggle), alt text that describes, form
  labels, `lang` attributes (Pidgin line uses `lang="pcm"`).
- No horizontal scroll at 320px; 16px side gutter on mobile.

## Definition of done

- Typecheck and production build pass.
- Checked in the browser at 375px, 768px and 1440px, in light and dark, with
  reduced motion on and off, with the API up and with it down. Screenshots of
  each section in both themes.
- Lighthouse scores above recorded.
- Every claim on the page maps to a real feature (list them in the PR).
- `CREDITS.md` complete; legal pages marked draft.
- Short PR description: what changed, why, before/after screenshots.

## Values to fill in before starting

- Company legal name and RC number:
- Registered address:
- Emails — general / support / fleets & partnerships / privacy:
- Phone (if different from WhatsApp):
- Social links (Instagram, X, LinkedIn, TikTok…):
- Production domain for the site (for canonical URLs and sitemap):
- Any real KURA photos to use instead of stock:
