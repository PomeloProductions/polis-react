# Changelog

## Unreleased

### ⚠ BREAKING CHANGES

* **renderer:** The page/component renderer is now framework-generic — all Todo (time-management) specifics have been removed. This changes the renderer's public surface and warrants a **minor** bump (0.2.0 → 0.3.0).
  * Removed built-in registry entries `day_summary`, `todo`, `todo_task`, and `todo_bullet_list` along with their widgets, plus `src/components/Todo/*`, `TodoContext`, `TimerContext`, `TodoRequests`, and the `todo` user model. Consumers that need these must supply their own widgets via `registerComponents(map)`.
  * `PageRenderer` no longer performs todo-tree PATCH drag logic. Drag-and-drop now only reorders top-level page components and is gated by `defaultPageTypeRegistry.isDraggable(page.page_type)`; register `{ draggable: true }` for a page type to opt in.
  * `DynamicPage` container sizing now comes from `defaultPageTypeRegistry.resolveContainerSize(page.page_type)` instead of the hard-coded `dashboard`/default check.
  * `PageRenderer` and `PageSettingsPanel` gained an optional `onRefresh?: () => void | Promise<void>` prop, replacing the removed `TodoContext.silentRefresh()` call after reorder / add / remove.

## [0.4.1](https://github.com/PomeloProductions/polis-react/compare/v0.4.0...v0.4.1) (2026-08-30)


### Bug Fixes

* **dark:** App shell header + background honor dark color scheme ([bb2bd79](https://github.com/PomeloProductions/polis-react/commit/bb2bd79458a03fca1f2e03e1482ccee56dde5218))
* **dark:** App shell header + background honor dark color scheme ([dafc690](https://github.com/PomeloProductions/polis-react/commit/dafc69073c72b8e7e06ecb79073c6990a7acca55))

## [0.4.0](https://github.com/PomeloProductions/polis-react/compare/v0.3.0...v0.4.0) (2026-08-30)


### Features

* Dark mode support ([a25f211](https://github.com/PomeloProductions/polis-react/commit/a25f2116880fa069e059f58d20a1e45640245a39))
* Dark mode support ([b59d04b](https://github.com/PomeloProductions/polis-react/commit/b59d04b2c1539ad56b534cad30560f25d8b03cc3))


### Bug Fixes

* Make the Page app shell responsive on mobile ([43abc9e](https://github.com/PomeloProductions/polis-react/commit/43abc9ea0baeade35652b28f124e0cf97bef82ca))
* Responsive mobile app shell (Page/AppShell) ([550aa9a](https://github.com/PomeloProductions/polis-react/commit/550aa9add60fbd935aa96318bd070dfff29be9f1))

## [0.3.0](https://github.com/PomeloProductions/polis-react/compare/v0.2.0...v0.3.0) (2026-08-21)


### ⚠ BREAKING CHANGES

* **renderer:** renderer public surface changed (Todo removed from the built-in registry — consumers must registerComponents(); onRefresh props added; draggability + container size now resolved from page-type-registry). Warrants a minor bump (0.2.0 -> 0.3.0).

### Features

* **renderer:** Make page renderer generic; remove Todo specifics ([31600cf](https://github.com/PomeloProductions/polis-react/commit/31600cf420717dec0101ff1703e42c5d457e0c98))
* **renderer:** Make page renderer generic; remove Todo specifics ([d75c97b](https://github.com/PomeloProductions/polis-react/commit/d75c97b6fc90e815f79a081c9989650a55aa3e6b))

## [0.2.0](https://github.com/PomeloProductions/polis-react/compare/v0.1.0...v0.2.0) (2026-08-12)


### Features

* Email + push template admin UI components ([05a3e7f](https://github.com/PomeloProductions/polis-react/commit/05a3e7f459208ccd2b28feaaa7c83f041b1bc32d))
* Email + push template admin UI components ([9b88f04](https://github.com/PomeloProductions/polis-react/commit/9b88f0462e908759b65e00a442983af62d14e8a9))
* **exports:** Expose ./test-utils subpath ([ed1b6d0](https://github.com/PomeloProductions/polis-react/commit/ed1b6d01bacff3d67ad2b7b78736932bcf980a77))
* **exports:** Expose stateful core (AppContext, MeContext, api, AuthRequests) from the barrel ([4e367c8](https://github.com/PomeloProductions/polis-react/commit/4e367c8473da1339f4b97334c327fd94f7d0c1e1))
* Extract DynamicPage / CategoryEditor / ComponentGuide from PolisOS ([5eae8da](https://github.com/PomeloProductions/polis-react/commit/5eae8dace73b15c4d6fe29e31882d9dc2fe3bab9))
* Finish theming refactor for remaining components ([8cf1d94](https://github.com/PomeloProductions/polis-react/commit/8cf1d9461242cb55537edbc9ab80b571adc70806))
* Finish theming refactor for remaining components ([5096e66](https://github.com/PomeloProductions/polis-react/commit/5096e66cbaaa0ff45e899aa2864af9dbd5df093c))
* **node-tree:** Extract generic recursive renderer + registries ([96acdd9](https://github.com/PomeloProductions/polis-react/commit/96acdd97867f61abfbd47c9d553b0980aabe26a4))
* **node-tree:** Extract generic recursive renderer + registries ([83d018b](https://github.com/PomeloProductions/polis-react/commit/83d018b897c2671384d8c52a60a7ca306f3e38b2))
* Organization detail pages + invite/accept-invitation flows ([4d46a26](https://github.com/PomeloProductions/polis-react/commit/4d46a266c925390f69751f825b0a0d1470d17dd9))
* Organization detail pages, invite + accept-invitation flows ([4f40dbc](https://github.com/PomeloProductions/polis-react/commit/4f40dbca82c02111360c7b12c3c2577dadc3e54d))
* **provider:** Also forward forceColorScheme for single-scheme apps ([8627a86](https://github.com/PomeloProductions/polis-react/commit/8627a863589941d3eed978dd9c31ef91e61d1f4c))
* **provider:** Forward defaultColorScheme to MantineProvider ([140480c](https://github.com/PomeloProductions/polis-react/commit/140480cf0772aea33f3567a02ebf95fdc06d756e))
* Render-prop forms, default pages, fixed exports map ([d60abc6](https://github.com/PomeloProductions/polis-react/commit/d60abc6f580757cf27aa5147c529736ea38f011d))
* **settings:** Move Organizations management to a standalone top-level page ([29b57d9](https://github.com/PomeloProductions/polis-react/commit/29b57d9e7ca084fa5353e4ea842ae3d042a80134))
* **settings:** Move Organizations management to standalone top-level page ([8abe756](https://github.com/PomeloProductions/polis-react/commit/8abe7566be0dd4b6aa0587b92ff53e1e53871852))
* **settings:** Reusable account/organization Settings scaffolding ([f250060](https://github.com/PomeloProductions/polis-react/commit/f250060d62cf4fdd907249d6fbb0a90a98f92607))
* **settings:** Reusable account/organization Settings scaffolding ([30f75bd](https://github.com/PomeloProductions/polis-react/commit/30f75bd902d9cedad4fe217884f32c02594cea89))
* Swappable theming via PolisProvider + token interface ([fd1914a](https://github.com/PomeloProductions/polis-react/commit/fd1914a871f29167888428da3a1646cda08244f8))
* Swappable theming via PolisProvider + token interface ([66d4b29](https://github.com/PomeloProductions/polis-react/commit/66d4b29ee211c0718580e62603699a7d30afba4d))
* **theme:** Add primaryTint/primarySubtle/primaryContrast tokens ([1f9056d](https://github.com/PomeloProductions/polis-react/commit/1f9056d67c382e57dde72806a2bbfcfe6ec921b0))
* V0.2 — render-prop forms, default pages, fixed exports map ([1cfa8ab](https://github.com/PomeloProductions/polis-react/commit/1cfa8ab9b46697e94fe4925d7ed7f46bd655cf96))
* V0.3 — extract DynamicPage / CategoryEditor / ComponentGuide pages from PolisOS ([cc1972d](https://github.com/PomeloProductions/polis-react/commit/cc1972df8154a5ee8b0da9d2f577dc6f4f591b41))


### Bug Fixes

* **ci:** Harden deferred paginated load and update stale session tests ([aad8e1e](https://github.com/PomeloProductions/polis-react/commit/aad8e1ecd523a423ecc8d4e5648eb42f58027a6e))
* **ci:** Mock api in CategoryAutocomplete test to stop leaked XHR flake ([ed77baa](https://github.com/PomeloProductions/polis-react/commit/ed77baabaeebdd4622f0da3b436a2b47ca65b471))
* **ci:** Stop leaked deferred load from crashing the Jest worker ([9cff672](https://github.com/PomeloProductions/polis-react/commit/9cff672539d8f37f3320e2cb039bd6df0360865d))
* Drop unused React imports in SignUpForm + SignUpPage ([cefc7fc](https://github.com/PomeloProductions/polis-react/commit/cefc7fc0446a58b8090c2c3448e372ac06fd195a))
* Drop unused React imports in SignUpForm + SignUpPage ([3bb4b23](https://github.com/PomeloProductions/polis-react/commit/3bb4b234fd9f359379825207a20a16607e57db29))
* **exports:** Map data/AppContext + data/connect .tsx subpaths ([3870b76](https://github.com/PomeloProductions/polis-react/commit/3870b76eff8df77e48f9e0ab22a1cf77996a51f9))
* **exports:** Map data/AppContext + data/connect .tsx subpaths ([5efab9f](https://github.com/PomeloProductions/polis-react/commit/5efab9f96e8334d0965fc9e5cb90c41d9bbecab2))
* **peers:** Tighten @mantine/* peer ranges from &gt;=7 to ^7 || ^8 ([5de7f73](https://github.com/PomeloProductions/polis-react/commit/5de7f7307611e4ed4c28f04ea3f57984053a4474))
* **peers:** Tighten @mantine/* peer ranges to avoid 9.x auto-resolve ([5c71fad](https://github.com/PomeloProductions/polis-react/commit/5c71fad607a7f70ba48ab04fbb6c501cef04842d))
* **settings:** Drop unused React default import in OrganizationForm ([fd1c61a](https://github.com/PomeloProductions/polis-react/commit/fd1c61a418001e2dbc626cad60af0230c4c2e4e1))
* **settings:** Drop unused React default import in OrganizationForm ([e552f5b](https://github.com/PomeloProductions/polis-react/commit/e552f5ba3d7a990bb0f1d95e3d187c10b1df610f))
* **SignInForm:** Rename defaultRedirect → onSuccessRedirect for prop parity ([f931a4a](https://github.com/PomeloProductions/polis-react/commit/f931a4a441e12466f5ddb2ef63bd6ec36ba9887c))
* **types:** Drop public any types in TodoContext + connect HOC ([ee04b48](https://github.com/PomeloProductions/polis-react/commit/ee04b486d8006398642508655331fb20c495f99b))

## Changelog

This file is maintained by release-please.
