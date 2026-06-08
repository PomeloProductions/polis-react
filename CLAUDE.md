# packages/polis-react

Shared React toolkit for Polis-family apps. Sibling of `polis-laravel`.

This is a **source package** — TypeScript ships unbuilt and the consumer
compiles it via its own Vite/TS. Faster iteration; the consumer's Vite must
allow `node_modules/@polis/react/**` to be processed (the path: dep mechanism
handles this automatically).

## What's in here

Imported wholesale from PolisOS's `apps/web/src/`:

- **services/** — `api.ts` (axios w/ JWT injection, 401 refresh, 429 backoff,
  GET dedup), `AuthManager.ts`, `requests/*` (per-resource HTTP wrappers).
- **contexts/** — `MeContext` (auth state w/ auto-refresh, network error
  handling), `BasePaginatedContext` (the paginated-list pattern PolisOS uses
  everywhere), TimerContext, plus polis-domain contexts (Todo, Categories,
  Collections, UserPages, Search) that are reusable patterns but assume the
  matching API shape.
- **components/** — AuthenticatedRoute, Errors/NetworkError, Forms/\*, Menu,
  Modals, PageRenderer, Template/Page, ApplicationLogo, BottomStickySection,
  Footnote, InputWrapper, LoadingScreen, GeneralUIElements, PhoneNumberInput,
  PrivacyPolicyText, ServerAlert, TermsOfUseText, ContactUsForm, Browse,
  Dashboard, Todo.
- **util/** — string helpers, platform detection, etc.
- **theme/** — SCSS theme (`main.scss`, `variables.scss`, `fonts.scss`,
  `responsive.scss`, `elements.scss`).
- **models/** — TypeScript interfaces for User, Category, Collection, …
- **data/**, **assets/**, **test-utils/**, **config/**.

## What's NOT in here (intentionally)

- The consuming app's entrypoint (`App.tsx`, `index.tsx` / `main.tsx`).
- Concrete pages (`pages/`) — each app composes its own pages from these parts.
- The consuming app's routing config.

## Customization rule

If a component here doesn't fit a consumer's needs, **the consumer forks it
locally** (copy the file into the consumer's `src/`, modify there). Don't
add consumer-specific flags to this package. Different consumers can have
different versions of the same screen — that's the whole point of putting
reusable parts here without forcing a layout.

## Future: migrating PolisOS + VGR to consume this

For now PolisOS and VGR still have their own copies in `apps/web/src/`.
Migration plan (later, separate work):

1. Add `"@polis/react": "file:../../packages/polis-react"` to each consumer.
2. Delete their copies of the moved files.
3. Update imports from `'../../components/X'` to `'@polis/react/components/X'`.
4. If a consumer needs a different version of a file, fork it back into
   their `src/` (the customization rule).

Until that migration runs, treat PolisOS as the canonical upstream and
`rsync` updates over (see README).
