# Coverage Baseline Report

Captured at the start of branch `ci/coverage-reporting-and-gap-filling`,
before any of this PR's new tests were added. All numbers come from
`jest --coverage` against the pre-existing 188 passing tests / 5 skipped.

## Overall baseline

| Metric     | Coverage |
|------------|----------|
| Lines      | 26.37% (959 / 3636) |
| Statements | 24.89% (984 / 3953) |
| Branches   | 14.63% (318 / 2173) |
| Functions  | 21.15% (202 / 955)  |

## Highest-impact zero-coverage files

Sorted by uncovered line count. The forms/pages/ComponentGuide
modules from PRs #2 and #3 dominate the top of the list — those are
the gap-filling priority.

```
312 lines | src/components/Todo/TodoTaskNodeRenderer.tsx
210 lines | src/components/Todo/todoTaskUtils.ts
169 lines | src/contexts/TimerContext.tsx
165 lines | src/components/Todo/TodoTaskSettingsDrawer.tsx
153 lines | src/components/PageRenderer/index.tsx
 93 lines | src/contexts/TodoContext.tsx
 86 lines | src/components/PageRenderer/widgets/DaySummaryWidget.tsx
 84 lines | src/components/Todo/FloatingTimer.tsx
 74 lines | src/components/PageRenderer/PageSettingsPanel.tsx
 74 lines | src/components/Todo/TodoHierarchyNav.tsx
 53 lines | src/contexts/UserPagesContext.tsx
 46 lines | src/pages/Browse/CategoryEditor/index.tsx
 42 lines | src/pages/ComponentGuide/ComponentPlayground.tsx
 41 lines | src/services/requests/TodoRequests.ts
 39 lines | src/pages/ComponentGuide/ComponentsIndex.tsx
 38 lines | src/components/PageRenderer/widgets/TodoTaskWidget.tsx
 31 lines | src/pages/DynamicPage/index.tsx
 28 lines | src/contexts/SearchContext.tsx
 25 lines | src/pages/ComponentGuide/AddToPageModal.tsx
 24 lines | src/pages/ComponentGuide/ConfigEditor.tsx
 23 lines | src/pages/ComponentGuide/ComponentDetail.tsx
 22 lines | src/contexts/CategoryContext.tsx
 22 lines | src/contexts/CollectionContext.tsx
 22 lines | src/contexts/UserContext.tsx
 15 lines | src/services/requests/UserPageRequests.ts
 14 lines | src/services/requests/OrganizationRequests.ts
 11 lines | src/pages/Auth/ResetPasswordPage/index.tsx
  9 lines | src/pages/ComponentGuide/ComponentGuideOverview.tsx
  8 lines | src/pages/Auth/ForgotPasswordPage/index.tsx
  8 lines | src/pages/Auth/SignInPage/index.tsx
  8 lines | src/pages/Dashboard/index.tsx
  7 lines | src/pages/Auth/SignUpPage/index.tsx
  7 lines | src/pages/Welcome/index.tsx
  7 lines | src/services/requests/FollowerRequests.ts
  6 lines | src/services/requests/ResetPasswordRequests.ts
  6 lines | src/services/requests/VerificationCodeRequests.ts
  5 lines | src/components/AuthenticatedRoute.tsx
  5 lines | src/components/PageRenderer/widgets/PageManagerWidget.tsx
  5 lines | src/components/PageRenderer/widgets/SettingsPanelWidget.tsx
```

## Notable partial-coverage files at baseline

| File                                            | Lines% |
|-------------------------------------------------|--------|
| src/services/requests/CollectionManagementRequests.ts | 10.0% |
| src/services/requests/CategoryRequests.ts       | 18.2% |
| src/services/requests/AuthRequests.ts           | 20.0% |
| src/services/api.ts                             | 38.7% |
| src/contexts/MeContext.tsx                      | 41.8% |
| src/components/Forms/SignUpForm/index.tsx       | 45.9% |
| src/components/Forms/ForgotPasswordForm/index.tsx | 50.0% |
| src/components/Forms/ResetPasswordForm/index.tsx  | 50.0% |
| src/components/Forms/SignInForm/index.tsx       | 50.0% |
| src/components/GeneralUIElements/DataList/index.tsx | 50.4% |

The four form components in PR #2 (`SignInForm`, `SignUpForm`,
`ForgotPasswordForm`, `ResetPasswordForm`) each had a one-line smoke
test that only verified rendering; submit / error / 422 paths were
all uncovered.

## Already well-covered (>=90%) at baseline

- `src/util/*` (regex, strings, view, platform, category-utils, collection-utils) — 86-100%
- `src/models/page.ts` — 90%
- `src/components/Menu/*` — 90.9-100%
- `src/components/Browse/CategoriesBrowser/CategoriesList/index.tsx` — 93.1%

These were tested as part of PR #1 (Jest setup) and don't need further work.

## What this PR's tests target

- All four PR #2 form components — full submit / validation / 422 / 429 / error path tests
- All four PR #2 Auth pages + `Welcome` + `Dashboard` — render, branding, cross-links
- All five PR #3 ComponentGuide pages + `componentMetadata` data module
- `DynamicPage` and `CategoryEditor` (PR #3)
- `UserPagesContext`, `UserContext`, `CategoryContext`, `CollectionContext`
- Eight 0%-coverage request modules (Asset, Follower, Invitation, Organization,
  ResetPassword, Todo, UserPage, User, VerificationCode)
- `todoTaskUtils.ts` — pure utility (33 tests covering the path / format helpers)
- Three small PageRenderer widgets and `ComponentRegistry`
