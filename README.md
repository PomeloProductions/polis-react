# @polis/react

Shared React core for Polis-family apps. This is the React-side sibling of
`@polis/polis-laravel`: one source of truth for auth, API client, base
contexts, layout primitives, and reusable components.

Initial contents were lifted from `PolisOS/apps/web/src/` on 2026-05-13.
PolisOS and Video Game Rankings are migrating onto it now.

## Layout

```
src/
├── assets/         Logos, icons, images
├── components/     Reusable React components (AuthenticatedRoute, Forms,
│                   Errors, Template/Page, PageRenderer, Menu, ...)
├── config/         Static app-level config
├── contexts/       React contexts (MeContext, BasePaginatedContext, ...)
├── data/           Static state stores + reducers
├── models/         TypeScript model interfaces matching the API
├── pages/          Default page compositions (Auth pages, Welcome,
│                   Dashboard) — use as-is or copy and customize
├── services/       api.ts (axios + auth interceptors), AuthManager,
│                   requests/ (per-resource request modules)
├── test-utils/     Test helpers
├── theme/          SCSS theme: variables, fonts, elements, responsive
├── util/           strings, platform detection, regex, etc.
└── index.ts        Top-level barrel exports
```

## Installing

In a sibling app's `package.json`:

```json
{
  "dependencies": {
    "@polis/react": "file:../../packages/polis-react"
  }
}
```

## Consuming

### v0.2 exports map (no consumer aliases required)

Subpath imports resolve directly through the package's `exports` field —
no `tsconfig` paths, no Vite alias, no Jest `moduleNameMapper`:

```ts
// Subpath imports
import Menu from '@polis/react/components/Menu';
import SignInForm from '@polis/react/components/Forms/SignInForm';
import api from '@polis/react/services/api';
import AuthRequests from '@polis/react/services/requests/AuthRequests';
import { ellipsisText } from '@polis/react/util/strings';

// Top-level barrels
import { Menu, SignInForm, ellipsisText, api } from '@polis/react';
```

The exports map is now structured so:

- `@polis/react/components/X` → `./src/components/X/index.tsx`
- `@polis/react/contexts/X` → `./src/contexts/X.tsx`
- `@polis/react/services/X` and `@polis/react/services/Y/Z` →
  `./src/services/X.ts` / `./src/services/Y/Z.ts`
- `@polis/react/util/X` → `./src/util/X.ts`
- `@polis/react/models/X` → `./src/models/X.ts`
- `@polis/react/pages/X` → `./src/pages/X/index.tsx`
- `@polis/react/theme/X` → `./src/theme/X.scss`

Plus barrel entries at every top-level directory (`@polis/react/components`,
`@polis/react/util`, `@polis/react/services`, `@polis/react/contexts`,
`@polis/react/models`).

If you were previously carrying a `tsconfig.json` `paths` mapping, a
`vite.config.ts` `resolve.alias`, or a `jest.config.js` `moduleNameMapper`
just to coax `@polis/react/...` resolution, you can delete all three.

## Theming

Themes ship as separate packages — `@polis/theme-bootstrap`,
`@polis/theme-mantine`, or a custom one — and each exports a `theme`
object that satisfies `PolisTheme` (defined in `@polis/react/theme`).
Swapping themes is a one-line consumer change.

### Consumer pattern

```tsx
import { PolisProvider } from '@polis/react';
import { theme } from '@polis/theme-mantine'; // or '@polis/theme-bootstrap'

<PolisProvider theme={theme}>
  <App />
</PolisProvider>;
```

`PolisProvider` does three things:

1. **Injects CSS custom properties** on `document.documentElement` for
   every token (e.g. `--polis-color-primary`, `--polis-font-body`,
   `--polis-radius-md`). SCSS files in this package read those vars with
   safe fallbacks: `background: var(--polis-color-surface, #fff)`.
2. **Wraps children in `<MantineProvider>`** using the theme's optional
   `mantineTheme` override so Mantine components pick up the same
   palette / fonts / radius.
3. **Exposes the active theme via React context** so components that
   need JS access to tokens can call `usePolisTheme()`:

   ```tsx
   import { usePolisTheme } from '@polis/react';
   const theme = usePolisTheme();
   // theme.colors.primary, theme.fonts.body, ...
   ```

### Writing a new theme

Create a package whose `src/theme.ts` exports a `theme: PolisTheme`
object. The interface is:

```ts
import type { PolisTheme } from '@polis/react/theme/PolisTheme';
```

…and includes `name`, `colors`, `fonts`, `radius`, `spacing`, and an
optional `mantineTheme`. See `@polis/theme-bootstrap` and
`@polis/theme-mantine` for reference implementations.

### Components and themes today

The PolisProvider + token interface plus an initial pass of token-
consuming components landed in the same change. Many components in
this package still ship with hardcoded values in their `.scss` —
they will render correctly under any theme, they just won't visually
respond to theme swaps yet. Migration is incremental: each component's
SCSS is updated to use `var(--polis-* )` over time. The components
already on the new tokens include InputWrapper, Footnote, LoadingScreen,
NetworkError, BottomStickySection, Menu/MenuLink, Template/Page, the
GeneralUIElements form inputs (UnderlinedInput, BorderedInput,
GrayInput, ConfirmationPageContent, Modal), the CategoryForm /
CollectionForm forms, the Dashboard MyCollections set, the
CollectionsModal item, and the Browse CategoriesBrowser /
CategoriesList. The `theme/elements.scss` baseline is also tokenized.

## Auth forms (v0.2)

Four render-prop forms are now shipped. The render-prop pattern lets
consumers inject additional fields without forking the package.

| Form                 | Endpoint                | Base fields                                          |
| -------------------- | ----------------------- | ---------------------------------------------------- |
| `SignInForm`         | `POST /auth/login`      | email, password                                      |
| `SignUpForm`         | `POST /auth/sign-up`    | email, password, password_confirmation, accept_terms |
| `ForgotPasswordForm` | `POST /forgot-password` | email                                                |
| `ResetPasswordForm`  | `POST /reset-password`  | password, password_confirmation (+ token, email)     |

Each form (except SignInForm, which keeps the v0.1 API) accepts:

- `additionalFields(formik)` — render-prop returning extra fields. The
  bag is the full `FormikProps<BaseValues & TExtra>` so consumers can
  read values, errors, touched, and call `setFieldValue` etc.
- `additionalValidation` — a Yup schema merged into the base schema.
  Describe only your extra fields; the base fields are validated by
  the package.
- `additionalInitialValues` (SignUpForm only) — initial values for the
  consumer's extra fields, merged with the base values.
- `additionalSubmitTransform` (SignUpForm only) — transform run on
  merged values right before the request fires.
- `onSuccessRedirect` — destination after success.

Robustness applied uniformly:

- 422 → server field errors lifted into Formik field errors
- 429 → handled by the api.ts toast / backoff (form just no-ops)
- Submission disables the button + shows a spinner
- Network/generic errors surface as a single error string under the form

### Example

```tsx
import * as Yup from 'yup';
import SignUpForm from '@polis/react/components/Forms/SignUpForm';

<SignUpForm
  additionalInitialValues={{ first_name: '', last_name: '' }}
  additionalValidation={Yup.object({
    first_name: Yup.string().required('First name is required'),
    last_name: Yup.string().required('Last name is required'),
  })}
  additionalFields={(form) => (
    <>
      <input
        value={form.values.first_name as string}
        onChange={(e) => form.setFieldValue('first_name', e.target.value)}
      />
      <input
        value={form.values.last_name as string}
        onChange={(e) => form.setFieldValue('last_name', e.target.value)}
      />
    </>
  )}
  onSuccessRedirect="/welcome"
/>;
```

## Default pages (v0.2)

Pre-composed pages live under `@polis/react/pages/`. They wrap each form
in a centered Mantine `<Paper>` layout with cross-page links and accept
an optional `branding` prop (`{ appName, logo }`):

- `@polis/react/pages/Auth/SignInPage`
- `@polis/react/pages/Auth/SignUpPage`
- `@polis/react/pages/Auth/ForgotPasswordPage`
- `@polis/react/pages/Auth/ResetPasswordPage`
- `@polis/react/pages/Welcome` — logged-out landing page with sign-in /
  sign-up CTAs and an optional copy slot via `children`
- `@polis/react/pages/Dashboard` — minimal logged-in stub that reads
  `MeContext` and shows a greeting; override `children` for real content

The `additionalFields` / `additionalValidation` / `additionalInitialValues` /
`additionalSubmitTransform` props on each form are forwarded through
their wrapper page, so you can use the pages without ever importing the
underlying forms:

```tsx
import SignUpPage from '@polis/react/pages/Auth/SignUpPage';

<SignUpPage
  branding={{ appName: 'Video Game Rankings' }}
  additionalInitialValues={{ first_name: '' }}
  additionalFields={(form) => /* ... */}
/>
```

## How it ships

This is a **source package**, not a built one — the consumer's Vite / TS
config compiles the package's TypeScript directly. No build step here.
Tradeoff: faster iteration, slightly slower consumer builds.

## Customization

The forms and pages are designed to be customized via props (render-prop
fields, additional validation, branding). If a component still doesn't
fit, fork it locally in the consuming app; don't bend the package to fit
a single consumer.

## Re-syncing from PolisOS (legacy)

Until PolisOS itself fully consumes this package, drift may exist. The
migration plan is in `CLAUDE.md`.
