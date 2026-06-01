# @polis/react

Shared React core for Polis-family apps. This is the React-side sibling of
`@polis/polis-laravel`: one source of truth for auth, API client, base
contexts, layout primitives, and reusable components.

Initial contents were lifted from `PolisOS/apps/web/src/` on 2026-05-13.
PolisOS and Video Game Rankings are not yet consuming this package — their
existing code is left in place and will be migrated separately.

## Layout

```
src/
├── assets/         Logos, icons, images
├── components/     Reusable React components (AuthenticatedRoute, Forms,
│                   Errors, Template/Page, PageRenderer, …)
├── config/         Static app-level config
├── contexts/       React contexts (MeContext, BasePaginatedContext, …)
├── data/           Static lookup tables (countries, etc.)
├── models/         TypeScript model interfaces matching the API
├── services/       api.ts (axios + auth interceptors), AuthManager,
│                   requests/ (per-resource request modules)
├── test-utils/     Test helpers
├── theme/          SCSS theme: variables, fonts, elements, responsive
├── util/           strings, platform detection, etc.
└── index.ts        (TODO) barrel exports
```

## Consuming this package

In a sibling app's `package.json`:

```json
{
  "dependencies": {
    "@polis/react": "file:../../packages/polis-react"
  }
}
```

Then in code:

```ts
import { api } from '@polis/react/services/api';
import MeContext from '@polis/react/contexts/MeContext';
import AuthenticatedRoute from '@polis/react/components/AuthenticatedRoute';
```

## How it ships

This is a **source package**, not a built one — the consumer's Vite / TS
config compiles the package's TypeScript directly. No build step here.
Tradeoff: faster iteration, slightly slower consumer builds.

## Customization

This package provides **building blocks**. Pages and how they're arranged
belong in the consuming app. If a component here doesn't fit, fork it locally
in the consuming app; don't bend the package to fit a single consumer.

## Re-syncing from PolisOS (for now)

Until PolisOS itself starts consuming this package, the canonical copy of
each file lives in `PolisOS/apps/web/src/`. To pull updates:

```bash
rsync -a \
  --exclude='App.tsx' --exclude='App.test.tsx' \
  --exclude='index.tsx' --exclude='index.test.tsx' \
  --exclude='pages/' --exclude='serviceWorker.ts' \
  --exclude='setupTests.ts' --exclude='*.d.ts' \
  /Users/bryce/Projects/PolisOS/apps/web/src/ \
  packages/polis-react/src/
```

Once PolisOS migrates onto this package the direction reverses: PolisOS
consumes from here, drift stops being a problem.
