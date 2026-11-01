# Frontend Architecture (`apps/web`)

## 1. Architectural Style: Feature-Based Organization

Vaultz uses a **Feature-Based Architecture** inside a Next.js App Router application. Instead of scattering all components, hooks, and API calls for a single domain across global folders, each financial domain owns a dedicated module inside `src/features/<feature>/`.

```text
apps/web/src/
├── app/                      # App Router routes, route groups, layouts, error boundaries
│   ├── (auth)/               # Public authentication routes (Milestone 2+)
│   ├── (dashboard)/          # Main application shell & dashboard routes
│   ├── error.tsx             # Global route segment error boundary
│   ├── globals.css           # Tailwind CSS & design tokens
│   └── layout.tsx            # Root HTML shell and providers
│
├── components/
│   ├── ui/                   # shadcn/ui design system primitives
│   ├── layout/               # Sidebar, top header, navigation shell
│   └── shared/               # Cross-feature reusable components
│
├── features/                 # Domain feature slices
│   ├── accounts/
│   ├── transactions/
│   ├── budgets/
│   ├── categories/
│   ├── savings/
│   └── reports/
│
├── lib/
│   ├── api/                  # Typed HTTP client, ProblemDetails error handling, QueryProvider
│   ├── auth/                 # Client/server auth session helpers
│   └── utils/                # cn(), currency/date formatters
│
├── hooks/                    # Shared application hooks
├── types/                    # Shared API contract & pagination types
└── config/                   # Typed environment and navigation configuration
```

### Feature Module Anatomy
When a feature (e.g., `accounts` or `transactions`) is implemented in future milestones, its internal structure follows:
```text
src/features/accounts/
├── api/                      # Feature-specific API calls using src/lib/api/client
├── components/               # Feature-specific UI components
├── hooks/                    # Feature-specific TanStack Query hooks
├── schemas/                  # Zod schemas for forms
├── types/                    # Feature-specific TypeScript interfaces
└── index.ts                  # Public barrel export for the feature
```

---

## 2. Next.js App Router Conventions

- **Route Groups:** `(auth)` isolates public authentication screens from `(dashboard)`, which wraps main application screens in the Vaultz sidebar and header layout.
- **Server Components by Default:** Pages and layouts in `src/app/` are React Server Components unless client interactivity is needed.
- **Client Component Boundaries:** Mark components with `'use client'` only when using React state, event listeners, React Hook Form, or TanStack Query hooks.

---

## 3. Data Fetching & Caching Strategy

1. **Server Rendering:** Initial static shells, layout metadata, and server-side checks execute in Server Components.
2. **TanStack Query (`@tanstack/react-query`):** Used for interactive client-side server state—such as live system status checks, filterable transaction tables, mutations (`useMutation`), and automatic query invalidation after state changes.
3. **Typed API Client (`src/lib/api/client.ts`):**
   - Prepends the configured API base URL (`NEXT_PUBLIC_API_BASE_URL`).
   - Attaches standard JSON headers and `credentials: 'include'` for secure cookie-based auth.
   - Parses non-2xx responses into a typed `ApiError` carrying RFC 9457 `ProblemDetails` and field-level `errors`.

---

## 4. Form & Validation Conventions

- Forms are built with **React Hook Form** and validated with **Zod** via `@hookform/resolvers/zod`.
- Client schemas validate shape, required fields, and basic formatting for responsive UX.
- Authoritative business and financial validation always happens on the backend; form error handlers map backend `ValidationProblemDetails.errors` onto the corresponding form fields.

---

## 5. Visual Design System — Modern, Minimalist & Soft on the Eyes

Vaultz follows a calm, low-fatigue visual system tailored for frequent financial review:

- **Warm Neutral Surfaces:** Instead of stark `#FFFFFF` backgrounds that cause eye strain, light mode uses a warm alabaster canvas (`#F6F5F2`) paired with softly elevated `#FDFCFB` cards and subtle warm-stone borders (`#E6E4DD`). Dark mode uses deep obsidian-slate (`#121417`) and `#181B1F` surfaces.
- **Restrained Accent Hierarchy:** A single calm sage-emerald accent (`#2A6B58` light / `#479980` dark) highlights primary actions and healthy statuses without visual noise.
- **Tabular Numerals:** All currency amounts, percentages, dates, and version numbers apply `tabular-nums` (`font-variant-numeric: tabular-nums`) so digits align vertically across lists and cards.
