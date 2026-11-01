# Frontend Rules (Next.js App Router & TypeScript)

These rules apply to all code inside `apps/web/`.

---

## 1. Project Organization

```text
apps/web/src/
├── app/                  # Next.js App Router pages, layouts, error boundaries
│   ├── (auth)/           # Public authentication route group
│   └── (dashboard)/      # Protected dashboard route group
├── components/
│   ├── ui/               # shadcn/ui primitives (Button, Card, Input, etc.)
│   ├── layout/           # App shell components (Sidebar, Header, PageContainer)
│   └── shared/           # Cross-feature reusable components (ErrorState, EmptyState)
├── features/             # Domain feature modules (accounts, transactions, budgets, etc.)
├── hooks/                # Shared custom React hooks
├── lib/
│   ├── api/              # Typed HTTP client, error classes, query provider
│   ├── auth/             # Auth session helpers and guards
│   └── utils/            # Pure utility functions (cn, currency formatting)
├── types/                # Shared API contract types (ProblemDetails, pagination)
└── config/               # Environment and navigation configuration
```

- **Feature Isolation:** Each feature folder under `src/features/<feature>/` owns its feature-specific `components/`, `api/`, `hooks/`, `schemas/`, and `types/`.
- Do not create empty placeholder files across every feature folder before those features are implemented.

---

## 2. TypeScript & Type Safety

- `strict: true` must remain enabled in `tsconfig.json`.
- Never use `any` or `@ts-ignore`. Use `unknown` with runtime narrowing (or Zod parsing) when handling untrusted data.
- Represent monetary amounts coming from the API as numbers or formatted decimal strings carefully—never perform floating-point arithmetic (`0.1 + 0.2`) on the client to compute authoritative balances. Display values returned by the backend and use `Intl.NumberFormat` for currency formatting.

---

## 3. Server vs. Client Components & Data Fetching

- Default to **React Server Components (RSC)** in `src/app/`. Add `'use client'` only at the leaf component boundary where interactivity, hooks, browser APIs, or TanStack Query are required.
- Use **TanStack Query** for interactive client-side state: paginated/filtered tables, optimistic updates, mutations, and cache invalidation.
- Do not route every static or initial server render through TanStack Query when a Server Component is more appropriate.
- Centralize all HTTP requests through `src/lib/api/client.ts` so base URLs, headers, credentials, and RFC 9457 `ProblemDetails` error parsing are handled consistently.

---

## 4. Forms & Validation

- Use **React Hook Form** paired with **Zod** (`@hookform/resolvers/zod`) for all user input forms.
- Frontend validation exists to provide immediate UX feedback (required fields, valid format, positive numbers).
- Do **not** duplicate complex backend domain invariants in the frontend; properly handle and display backend validation errors (`ProblemDetails.errors`) on form fields.

---

## 5. Styling & UI Conventions (Modern, Minimalist & Soft on the Eyes)

- Use **Tailwind CSS** utility classes and **shadcn/ui** components.
- **Visual Direction — Minimalist & Soft on the Eyes:**
  - Avoid harsh pure `#FFFFFF` backgrounds paired with stark `#000000` text or heavy high-contrast borders.
  - **Light Palette:** Use warm alabaster/stone canvas backgrounds (`#F7F7F5` / `#FAFAF9`), softly elevated card surfaces (`#FFFFFF` with subtle low-contrast stone borders `#E7E5E4`), deep warm slate primary text (`#1C1917` / `#18181B`), and muted stone secondary text (`#78716C` / `#71717A`).
  - **Dark Palette:** Use soft deep slate/obsidian backgrounds (`#111315`), calm elevated surfaces (`#181B1F`), muted hairline borders (`#262A30`), and off-white text (`#F4F4F5`).
  - **Restrained Accent:** Use a single calm sage/emerald-teal accent (`#2F6F5E` / `#10B981` muted) for primary actions and positive indicators—never flood the screen with saturated neon colors, gradients, or heavy drop shadows.
  - **Spacing & Radii:** Use generous whitespace, clean hairline borders (`1px`), rounded card corners (`rounded-2xl` / `16px`), and subtle hover transitions.
- **Financial Typography:**
  - Use `tabular-nums` (`font-variant-numeric: tabular-nums`) on all monetary figures, percentages, dates, and tables so digits align vertically.
  - Limit font weights to regular (`400`), medium (`500`), and semibold (`600`) for a calm typographic hierarchy.
  - Ensure full keyboard navigation, visible focus states, and semantic HTML landmarks (`<main>`, `<nav>`, `<header>`).
