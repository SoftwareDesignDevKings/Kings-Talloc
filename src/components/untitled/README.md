# Untitled UI components

Shared presentation primitives adapted from the free MIT-licensed [Untitled UI React source](https://github.com/untitleduico/react/tree/1d410cb8facde8d50869e7bbb5f3d048e2267466), pinned at revision `1d410cb8facde8d50869e7bbb5f3d048e2267466`. The upstream license is retained in `LICENSE`. Application-owned compositions use these primitives; paid templates are not copied.

The adaptations remove TypeScript annotations, use local imports, prefix Tailwind utilities/variables with `uui`, and forward input/dialog refs for React 18. Scoped reset markers provide the defaults needed by the components while Bootstrap remains in use. The stylesheet omits global Preflight. The table frame retains native semantic tables; it does not implement the complete upstream table component.

Run `npm run ui:build` after editing primitives or `styles/input.css`, and commit `styles/generated.css` alongside its sources. Production builds consume this committed stylesheet.

## Behavior boundaries

The main branch's scheduling service, account/authentication logic, Firestore rules, API routes, hour calculator and export backend remain authoritative. Page-level adapters pass the same participant objects, revisions and server mutation payloads through the new controls. Dashboard and Tutor Hours use `src/lib/scheduling/hours.js`; CSV details, payroll warnings, weekly Word exports and their calculations are retained.

Date/time fields use React Aria segmented input and the shared calendar. They preserve local wall-clock values, report incomplete drafts, and keep popup portals inside the active dialog. The report's free-text date fields use DD/MM/YYYY to match the school's existing main-branch convention. Student group search retains the existing asynchronous endpoint and fixed requester; its portal stays inside the dialog.

Dialogs retain destructive confirmations, busy-state locks, main's initial focus/details section and main's distinction between rejection and permanent deletion. React owns dialog and accordion presentation. Auth/data-provider rewrites from the earlier UI trial are excluded from this port.

The `/ui-preview/button` comparison content is guarded by `notFound()` outside development. Its sample state does not persist data.
