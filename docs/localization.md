# Localization guide

Event Manager supports **Norwegian (`nb`)** and **English (`en`)**. Norwegian is the default.

## Architecture

| Layer | API | Use in |
|-------|-----|--------|
| Client | `useTranslation()` → `{ t, locale, setLocale, formatCurrency, … }` | Client components |
| Server | `getServerTranslation()` → `{ t, locale, … }` | RSC, metadata, invoice print |
| Persistence | Cookie `event-manager-locale` + Zustand `localStorage` | Cross-session preference |

Route paths are **not** prefixed (`/app/dashboard` stays the same).

## Adding strings

1. Add the Norwegian key to the appropriate file under `src/i18n/dictionaries/parts/`.
2. Mirror the same shape in `src/i18n/dictionaries/en.ts` (or the matching `*En` part file).
3. Use `t("domain.key")` in components. Interpolation: `t("auth.pages.loginTagline", { appName })`.

```tsx
const { t, formatCurrency } = useTranslation();
return <h1>{t("dashboard.title")}</h1>;
```

```tsx
const { t } = await getServerTranslation();
```

## Enum / status labels

Translate **display** only. Never change DB or Stripe values.

```tsx
import { statusLabel, roleLabel } from "@/lib/navigation/nav-labels";
statusLabel(booking.status, t);
roleLabel(member.role, t);
```

## Validation messages

Zod schemas are locale-aware via factories in `src/lib/validations.ts`:

```tsx
import { createLoginSchema, validationMessagesForLocale } from "@/lib/validations";

const schema = useMemo(
  () => createLoginSchema(validationMessagesForLocale(locale)),
  [locale],
);
```

Message keys live in `src/i18n/dictionaries/parts/validation.ts`.

## Formatting

Prefer helpers from `useTranslation()` or `src/i18n/formatters.ts`:

- `formatDate`, `formatDateTime`, `formatCurrency`, `formatNumber`, `formatPercent`

## Language switcher

`src/components/language/language-switcher.tsx` — sets cookie, Zustand, `html[lang]`, and calls `router.refresh()` for RSC.

## Audit

```bash
npm run i18n:audit
```

Flags files outside dictionaries that still contain `æ`, `ø`, or `å` in string literals.

## Intentional exceptions

Do not translate:

- Route paths, API paths, env vars
- DB / Stripe enum values (`pending`, `owner`, `canceled`, …)
- Stored preset values used as DB keys (`Bedrift`, `Bryllup`, …)
- TypeScript identifiers, SQL migrations
- Server logs not shown in UI
