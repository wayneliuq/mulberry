# UI Redesign Baseline Matrix

Baseline for Material 3 major redesign. Behavior and API IO must remain unchanged.

| Surface | Header | Actions | States | Visual | Copy | Behavior parity |
|---------|--------|---------|--------|--------|------|-----------------|
| Shell | App bar title + edit status | Bottom nav (4 routes) | Focus order, safe area | pass | pass | pass — route paths unchanged |
| Games | Recent games + edit mode | New game, filters, sign-in | Loading, empty, view-only | pass | pass | pass — create/delete game IO |
| GameView | Game name + status | Round, players, settings, settle | Settled, admin, read-only | pass | pass | pass — round/roster/settle IO |
| Leaderboards | Standings | Filters, show money | Loading, empty families | pass | pass | pass — sort/rank IO |
| Dashboards | Basketball analytics | Section jump, back link | Loading, empty metrics | pass | pass | pass — dashboard fetch IO |
| Admin | Player maintenance | Create/rename/delete player | Locked, editing | pass | pass | pass — admin write IO |

## Cross-surface checks

| Pattern | Visual | Copy | A11y | Parity |
|---------|--------|------|------|--------|
| Confirms (settle, delete, undo) | pass | pass | pass | pass |
| Drawers (add players) | pass | pass | pass | pass |
| Role-gated controls | pass | pass | pass | pass |
| Keyboard / focus (bottom nav, filters) | pass | pass | pass | pass |

## Validation evidence (D7)

- Automated: `npm test`, `npm run build` — all passing
- Shell: `AppLayout.test.tsx` — bottom nav hidden on `/games/:id`, titles per route
- Integration: `App.test.tsx` — nav, admin unlock, create game gating
- Manual checklist: deep links, back/forward, mobile safe-area padding via CSS env()
