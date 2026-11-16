# Design system

HOPE is used by frightened people on cheap phones, and by tired staff during long nights. The design is **minimal, calm and clear**: one main action per screen, generous spacing, colour only where it carries meaning, and motion only where it explains what just happened.

## Principles

1. **Calm in a crisis.** Quiet neutral surfaces. Red is reserved for "act now".
2. **One thing at a time.** Each citizen screen has one primary button.
3. **Readable at arm's length.** Large type, strong contrast, plain words.
4. **Fast on a ₹6,000 phone.** Small bundles, no heavy effects, works on 2G.
5. **Motion explains, never decorates.** Short transitions that show a change of state.
6. **Same look everywhere.** Citizen PWA and staff console share one component library and one set of tokens.

## Tech stack (UI)

| Concern | Choice |
|---|---|
| Framework | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS v4 (CSS variables, OKLCH colours) |
| Components | **shadcn/ui** (built on Radix primitives), kept in `packages/ui` and shared by both apps |
| Animation | **Motion** (`motion/react`, the successor to Framer Motion) with `LazyMotion` + `domAnimation` for a small bundle |
| Icons | lucide-react |
| Toasts | sonner (shadcn) |
| Forms | React Hook Form + Zod (same schemas as the API, from `packages/shared`) |
| Data fetching | TanStack Query |
| Routing | React Router 7 (declarative routes, lazy-loaded screens) |
| Tables (console) | TanStack Table via shadcn Data Table |
| Charts (console) | shadcn Charts (Recharts) |
| Maps (console only) | MapLibre GL + OpenStreetMap tiles |
| PWA | vite-plugin-pwa (Workbox) |
| i18n | Typed dictionaries (UI: `apps/citizen/src/i18n.tsx`; SMS / WhatsApp: `packages/i18n`) — no i18n runtime needed |

shadcn components are copied into `packages/ui/src/components` and themed with HOPE tokens, so we own the code and can trim it.

## Typography

| Use | Font | Source |
|---|---|---|
| **Logo, headings, large numbers** | **The Henston** (400, 700, italics) | Adobe Fonts kit `mdg5ygi` |
| Body, buttons, forms, tables (Latin) | Inter | Self-hosted via `@fontsource-variable/inter` |
| Bengali | Noto Sans Bengali | Self-hosted via `@fontsource` |
| Hindi (Devanagari) | Noto Sans Devanagari | Self-hosted via `@fontsource` |

Why two families: The Henston gives HOPE its character, but a display face is hard to read at small sizes in forms and tables, and it has no Bengali or Devanagari glyphs. Inter and Noto keep body text clear in all three languages.

```html
<link rel="preconnect" href="https://use.typekit.net" crossorigin>
<link rel="stylesheet" href="https://use.typekit.net/mdg5ygi.css">
```

```css
@theme {
  --font-display: "the-henston", "Noto Sans Bengali", "Noto Sans Devanagari", Georgia, serif;
  --font-sans: "Inter Variable", "Noto Sans Bengali", "Noto Sans Devanagari", system-ui, sans-serif;
}
```

Adobe Fonts setup notes:
- Add every domain that serves HOPE (including `localhost`) to the web project in Adobe Fonts, or the kit won't load there.
- Set the kit's **font-display to `swap`** in the Adobe Fonts web project settings, so text shows immediately.
- When offline (or on a laptop demo without internet) the kit can't load; the fallback stack takes over and the layout must still look right. Body fonts are self-hosted and cached by the service worker, so the PWA reads correctly offline.

### Type scale

| Token | Size / line height | Font | Use |
|---|---|---|---|
| `display` | 40 / 44 | The Henston 700 | Logo, booking code |
| `h1` | 28 / 34 | The Henston 700 | Screen titles |
| `h2` | 22 / 28 | The Henston 400 | Section titles |
| `body-lg` | 18 / 28 | Inter 400 | **Citizen body text (default)** |
| `body` | 16 / 24 | Inter 400 | Console body text |
| `label` | 14 / 20 | Inter 500 | Labels, table headers |
| `caption` | 13 / 18 | Inter 400 | Hints, timestamps |

Bengali and Devanagari need more line height: use `leading-relaxed` (≥ 1.6) for those languages.

## Logo

For now the logo is a **wordmark: "HOPE"** set in The Henston 700, uppercase, letter-spacing `0.08em`.

```tsx
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("font-display font-bold uppercase tracking-[0.08em]", className)}>
      HOPE
    </span>
  );
}
```

- Sizes: 20 px in app headers, 40 px on the welcome screen, 64 px+ on the landing page.
- Colour: `foreground` only. On the red alert banner it is white.
- Favicon and app icon: "H" in The Henston on the brand background, until a proper mark exists.
- The console header shows `HOPE` plus a small `Console` label, so staff always know which app they're in.

## Colour

Minimal palette: neutral surfaces, one brand colour, and four status colours that always mean the same thing.

| Token | Light | Dark | Meaning |
|---|---|---|---|
| `background` | `oklch(0.99 0 0)` | `oklch(0.16 0 0)` | Page |
| `foreground` | `oklch(0.18 0 0)` | `oklch(0.96 0 0)` | Text |
| `muted` / `muted-foreground` | `oklch(0.96 0 0)` / `oklch(0.50 0 0)` | `oklch(0.24 0 0)` / `oklch(0.70 0 0)` | Secondary surfaces, hints |
| `border` | `oklch(0.91 0 0)` | `oklch(0.30 0 0)` | Dividers, inputs |
| `primary` | `oklch(0.42 0.09 200)` deep teal | `oklch(0.72 0.10 200)` | Brand, primary buttons, links |
| `danger` | `oklch(0.55 0.21 27)` | `oklch(0.68 0.19 27)` | **Evacuate now**, destructive actions |
| `warning` | `oklch(0.75 0.15 75)` | `oklch(0.80 0.14 75)` | Warning / watch |
| `info` | `oklch(0.55 0.13 250)` | `oklch(0.72 0.12 250)` | Updates |
| `safe` | `oklch(0.55 0.13 150)` | `oklch(0.72 0.14 150)` | Booked, checked in, all clear |

Rules:
- Status colour is always paired with an icon and a word, never colour alone.
- Text contrast meets WCAG 2.2 AA (4.5:1); large text and icons 3:1.
- Light and dark themes follow the system setting; citizens can override it.

## Spacing, shape, elevation

- 4 px grid; screen padding 16 px on mobile, 24–32 px on desktop.
- Radius: `--radius: 0.75rem` (cards, buttons), full for pills and badges.
- Elevation: borders instead of shadows; one soft shadow only for floating sheets and dialogs.
- Touch targets: **at least 48 × 48 px** in the citizen app.

## Motion

Library: **Motion** (`motion/react`).

```tsx
<MotionConfig reducedMotion="user" transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}>
  <LazyMotion features={domAnimation} strict>
    <App />
  </LazyMotion>
</MotionConfig>
```

| Token | Duration | Use |
|---|---|---|
| `fast` | 120 ms | Hover, press, toggle |
| `base` | 200 ms | Cards, sheets, step changes |
| `slow` | 320 ms | Page transitions, booking confirmation |

Where motion is used:
- **Step changes** in the booking flow: content slides 16 px and fades (`AnimatePresence`, `mode="wait"`).
- **Booking confirmed**: the check icon draws in, then the code fades up — one time, under 600 ms.
- **New alert**: the alert card slides down with a **single** gentle pulse on the status dot. No looping animations.
- **Live numbers** in the console (deliveries, capacity) count up smoothly; capacity bars animate their width.
- **Lists** (rescue queue, arrivals) use `layout` animations so new items push others down instead of jumping.

Rules:
- Respect `prefers-reduced-motion` (fades only, no movement).
- Animate only `transform` and `opacity`.
- Nothing blocks input while animating.
- No decorative loops, particles, parallax or 3D.

## Citizen PWA

Mobile-first, centred column (max width 480 px) on larger screens.

| Screen | Contents |
|---|---|
| Welcome | Logo, one sentence, language choice (বাংলা / English / हिन्दी), *Continue* |
| Sign in | Phone number → OTP (shadcn `InputOTP`) |
| Home — no alert | "No active warnings for {area}" in calm neutral; your shelter list; household summary |
| Home — active alert | Full-width status card (warning / evacuate colour), source, time; two buttons: **Book shelter** (primary) and **Need rescue** (danger outline) |
| Book | Stepper: people → needs → confirm. One question per step |
| Booked | Large booking code in The Henston, QR code, shelter name, hold time, *Directions* (opens the phone's map app), *Cancel* |
| Rescue | People count → landmark / share location → confirmation and live status |
| Settings | Language, theme, household details, opt out |

shadcn components used: `Button`, `Card`, `Badge`, `Alert`, `Input`, `InputOTP`, `RadioGroup`, `Sheet`, `Dialog`, `Progress`, `Skeleton`, `Sonner`.

Performance budget: **≤ 150 KB JS gzipped** for the first load. No map library in the citizen app; directions open the device's maps.

## Staff console

Desktop-first, responsive down to phone for shelter operators.

- Layout: shadcn `Sidebar` (role-based navigation) + top bar with the `HOPE Console` logo, incident switcher, user menu.
- Pages: Overview (map + counters), Incidents, Alerts (draft → approve), Shelters, Rescue desk, Check-in (mobile layout), Households (volunteer registration), Audit log, Settings.
- Data-heavy views use shadcn `Data Table`, `Tabs`, `Command` (quick search), `Chart`.
- Destructive or high-impact actions (approve alert, send, kill switch) use a confirmation `AlertDialog` that restates exactly what will happen and to how many people.

## Accessibility

- WCAG 2.2 AA throughout.
- Visible focus rings (`ring` token), full keyboard support (Radix provides this).
- All icons have text labels or `aria-label`.
- `lang` attribute changes with the selected language so screen readers pronounce correctly.
- Never rely on colour alone; never rely on animation to convey information.
