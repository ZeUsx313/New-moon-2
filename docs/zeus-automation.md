# ZEUS durable job console

The new `/dashboard/automation` page extends the existing dashboard. It is hidden by default (`VITE_DURABLE_JOBS=false`). No production origin, login flow or existing translation page was replaced.

Before enabling on a preview, set `VITE_API_URL` to the isolated backend, configure an isolated staff account, and verify that backend's durable engine and storage acceptance gates. The default API URL still points at the current production backend and must not be used for staging tests.

The page creates one persisted job with an idempotency key, reads authoritative progress, and supports pause/resume/cancel. Polling only updates the display; the browser never dispatches worker steps. Closing/reopening the page reloads saved jobs. Chapter lists use cursor pages so large novels do not require polling every chapter.

Smart translation, pure translation and glossary extraction remain distinct choices. For legacy novels without an original receipt, the user may explicitly select the current content as the job source; the server snapshots it before translation.

Validation: TypeScript and Vite build passed; 39 Vitest tests passed, including progress after remount, pause through the API, a stable creation key after network failure, and feature-disabled behavior. A live source/AI/staging browser flow is not claimed. Keep the PR draft until backend/storage/live verification passes.
