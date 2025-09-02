# Client QA – Agent Chat UI

Use this checklist to validate the AgentChatComponent UX across states.

## Setup
- Logged-in user available (normal or Google).
- API up with valid `OPENAI_API_KEY`.

## Rendering & Layout
- Initial state: input visible; no buttons until typing begins.
- Typing any character shows Ask, Filters, Clear Input buttons.
- Filters panel toggles via the Filters button; ARIA attributes set (`aria-expanded`, `aria-controls`).
- On mobile (≤640px):
  - Input wraps to full width; buttons wrap nicely.
  - Filters grid switches to single column.

## Behavior
- Ask:
  - Loading label shows “Asking...”.
  - On success: field clears; last question is saved as Q. above the answer; answer shows with inline A.
- Clear Input: clears input and hides the action buttons.
- Filters: tags/priority/dueOnly send as filters when provided.

## Answer Formatting
- Inline labels:
  - Shows `Q. <last question>` above.
  - Shows `A.` inline with the answer body.
- Numbered lists:
  - Titles in bold are recognized; metadata lines shown underneath as bullets.
  - Date-like metadata (Due, Start date, Deadline) display as badges and color-code:
    - Overdue (red), Upcoming (≤14 days, orange), Future (green).
- Plain text fallback renders cleanly with normalized whitespace.
- Inline citations like `[M-<id>]` are removed from the display.

## Error States
- No auth: prompt user to log in (buttons disabled/hidden accordingly).
- 401/403: shows error and logs out (session expired).
- 500 or model errors: shows a friendly error message.

## Accessibility
- Keyboard: input focus, Enter submits, tabbing reaches buttons and filters fields.
- Screen readers: the Q./A. labels are text; announce order is Question then Answer.

## Regression checks
- Memories list still renders and updates normally (create/edit/delete flows unaffected).
- No layout overlap with the Sort or Create controls.

