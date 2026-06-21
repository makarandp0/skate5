# Skate5 Design System

## Philosophy

Modern and clean, with a touch of playfulness inspired by skate4. Not corporate-stiff, not cartoon-ish — approachable and warm.

- **Simple use cases (view schedule, RSVP)**: Mobile-first. Must work beautifully on a phone at the skate park.
- **Administrative use cases (create classes, manage grids, manage badges)**: Desktop-friendly is fine. Admins are typically on laptops.
- **No legacy constraints**: Free to rethink flows, layouts, and interactions from scratch.

## Layout

- **Mobile**: Single-column, full-width cards, bottom navigation
- **Desktop**: Centered content (max-w-lg for primary content, max-w-4xl for admin grids)
- **Breakpoint strategy**: Design for 375px minimum, enhance at `sm:` (640px) and `md:` (768px)
- **Touch targets**: Minimum 44px height for interactive elements (buttons, list items, tabs)
- **Spacing**: Use `p-4` as the base page padding on mobile, `p-6` on `sm:`

## Navigation

- **Mobile**: Bottom tab bar (fixed) with 3-4 primary destinations
  - Classes (home), My RSVPs, Profile
  - Admin: additional "Manage" tab
- **Desktop**: Top header bar with navigation links
- **Active route**: Blue (`text-primary`) + bold on mobile; blue text on desktop

## Color Palette

Using CSS custom properties (defined in `app.css`) with class-based dark mode (`.dark` on `<html>`):

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `background` | #ffffff | #0a0a0a | Page background |
| `foreground` | #0a0a0a | #fafafa | Primary text |
| `muted` | #f5f5f5 | #262626 | Card backgrounds, secondary surfaces |
| `muted-foreground` | #737373 | #a3a3a3 | Secondary text, labels |
| `primary` | #2563eb | #3b82f6 | Buttons, active nav, accent (blue) |
| `primary-foreground` | #ffffff | #ffffff | Text on primary |
| `border` | #e5e5e5 | #262626 | Dividers, card borders |
| `ring` | #2563eb | #3b82f6 | Focus rings |

Additional semantic colors (to add as needed):
- `destructive` — for cancel/delete actions
- `success` — for confirmed RSVPs
- `warning` — for draft/pending states

## Theme Toggle

Dark/light mode is controlled via a toggle button in the header (sun/moon icon). Implementation:
- Class-based dark mode (`@custom-variant dark` in Tailwind v4)
- State managed by `useTheme` hook (`packages/web/src/hooks/useTheme.tsx`)
- Persisted in `localStorage` under `skate5-theme`
- Falls back to system preference on first visit

## Typography

- **Font**: System font stack (no custom fonts — faster load on mobile)
- **Scale**: Tailwind defaults
  - Page titles: `text-xl font-bold` (mobile) / `text-2xl` (desktop)
  - Section headers: `text-lg font-semibold`
  - Body: `text-sm` (mobile) / `text-base` (desktop)
  - Captions/labels: `text-xs text-muted-foreground`

## Components

Using **shadcn/ui** primitives (copy-paste, not npm packages). Components live in `packages/web/src/components/ui/`.

### Core components needed:
- `Button` — primary, secondary, ghost, destructive variants
- `Card` — class cards, RSVP cards
- `Badge` — skill level badges (maps to domain Badge concept)
- `Input` / `Textarea` — forms
- `Dialog` / `Sheet` — Sheet (bottom drawer) on mobile, Dialog on desktop
- `Tabs` — for class detail sections
- `Avatar` — user photos
- `Skeleton` — loading states

### Custom components (in `packages/web/src/components/`):
- `ClassCard` — summary view of a class (title, date, RSVP count)
- `RsvpButton` — tap to cycle through yes/maybe/no
- `BottomNav` — mobile tab bar
- `PageHeader` — consistent page title + back button pattern

## Patterns

### Loading states
- Use Skeleton components for initial page loads
- Inline spinners for actions (RSVP, form submit)
- Optimistic updates for RSVP toggling

### Empty states
- Friendly illustration-free message + CTA button
- "No classes yet" / "You haven't RSVPed to any classes"

### Error states
- Toast notifications for transient errors (network issues)
- Inline error messages for form validation

### Lists
- Flat card lists on mobile (no nested accordions)
- Pull-to-refresh feel: loading skeleton at top on refetch
- Group classes by date with sticky date headers

### Forms
- Full-screen on mobile (Sheet/page), Dialog on desktop
- Large input fields with clear labels
- Submit button always visible (sticky bottom on mobile)

## Iconography

Using **Lucide React** (already installed). Consistent 20px size for nav, 16px inline.

## Accessibility

- All interactive elements must be keyboard-navigable
- ARIA labels on icon-only buttons
- Focus-visible rings using the `ring` token
- Color contrast meets WCAG AA (the neutral palette naturally does)

## File Organization

```
packages/web/src/
  components/
    ui/           # shadcn/ui primitives (Button, Card, etc.)
    ClassCard.tsx
    RsvpButton.tsx
    BottomNav.tsx
    PageHeader.tsx
  routes/
    ClassList.tsx     # "/" — list of upcoming classes
    ClassDetail.tsx   # "/classes/:id" — single class view
    Profile.tsx       # "/profile" — user settings
    Login.tsx         # "/login" — auth flow
    Admin.tsx         # "/admin" — class management (admin only)
  hooks/
    useAuth.tsx       # Firebase auth state hook
    useApi.tsx        # Typed API query hooks
  lib/
    api.ts            # Typed API client
    firebase.ts       # Firebase init
    utils.ts          # cn() utility
  App.tsx             # Router + layout shell
  main.tsx            # Entry point
```

## RSVP UX

The core interaction. Must be fast and satisfying:
1. User sees class card with current RSVP state (or empty)
2. Tap card → class detail with prominent RSVP section
3. RSVP buttons: Yes (green), Maybe (yellow), No (red) — single tap toggles
4. Optimistic update: button state changes immediately, syncs in background
5. If already RSVPed: show current choice as selected, tap another to change

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-06-19 | Mobile-first, bottom nav | Primary users are on phones at skate parks |
| 2026-06-19 | System font stack | Fastest load, native feel on mobile |
| 2026-06-19 | shadcn/ui primitives | Full control, no bundle bloat, Tailwind-native |
| 2026-06-19 | Neutral palette with semantic accents | Clean, works in dark mode, accessible |
| 2026-06-19 | Optimistic RSVP updates | Core action must feel instant |
| 2026-06-20 | Blue primary accent (#2563eb) | Inspired by skate4's friendly blue; adds warmth without being flashy |
| 2026-06-20 | Card shadows + hover lift | Subtle depth and micro-interactions make UI feel alive |
| 2026-06-20 | Class-based dark mode with toggle | User control over theme; persisted in localStorage |
