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

## Application form validation

- Sign in: malformed email and passwords shorter than 6 characters show inline feedback and keep Sign in disabled. Existing passwords are not judged against the new-password complexity rule.
- Create account: require first name and surname, valid email, matching passwords, and a 6-to-72-character password containing uppercase, lowercase, a number, and a supported special character.
- Password recovery: require a valid email. Token-based reset uses the same new-password rule and redirects only after API success.
- Contact: require first name and surname, valid email, and at least 9 non-space message characters.
- Create/Edit memory: reject blank or whitespace-only titles, require at least 5 non-space note characters, limit priority to 1-5, and require a date when the reminder control is enabled.
- Edit Details: validate only the selected field and send only that field in the update request. The Update label remains stable while disabled.
- Agent Chat: reject blank questions, limit questions to 500 characters, and accept only low, med, or high in the optional priority filter.
- Image selection: accept JPG and PNG only, enforce the 5 MB limit before preview, and retain the API upload check as the final authority.
- Accessibility: invalid shared inputs expose `aria-invalid`; error text is linked through `aria-describedby`; password visibility uses a labelled keyboard-accessible button.
- Do not submit account, password, Contact, memory, or image forms during visual-only QA. Use deliberately non-sensitive test values and stop before any action that would change data or send email.
