# UI and UX page audit checklist

Use this checklist when reviewing one Corporate Memory route at a time. It is based on the sign-in-page review completed on 4 September 2026 and should guide focused refinements without replacing the established design system.

## 1. Confirm the page purpose

- Can a first-time user identify the page's main task immediately?
- Is the most common action visible before secondary information and options?
- Does the page use one consistent name for the task in navigation, headings, buttons, and feedback?
- Are repeated labels adding useful context, or merely repeating the same instruction?

## 2. Check visual hierarchy

- The primary action must be more prominent than optional or third-party actions.
- Competing actions should use equal, deliberate geometry when they have equal importance.
- Secondary buttons must still look actionable through a distinct control surface, visible border or depth, and clear hover, focus, and pressed feedback. They must not blend into their surrounding panel.
- Separators such as `or` must occupy their own clear space and must not overlap controls.
- Supporting guidance must remain visibly secondary to the task the user came to complete.

## 3. Apply the established component language

- Use semantic fieldsets and uppercase legends for functional groups where appropriate.
- Keep the approved off-black, dark-blue, off-white, and runtime accent palette.
- Reuse the established 8px radius, border hierarchy, type families, and spacing rhythm.
- Do not introduce an isolated panel style when an existing fieldset pattern already fits.

## 4. Review mobile reading order and density

- Put the main task first in the document and visual order.
- Keep labels, controls, and primary actions comfortably readable and tappable.
- Stack controls when a horizontal layout creates unequal widths, wrapping, or collisions.
- Shorten supporting copy before reducing its type size.
- Confirm the page has no horizontal overflow and does not require unnecessary scrolling before the primary action.

## 5. Review forms and feedback

- Keep labels above inputs and errors directly associated with the relevant control.
- Empty text fields, text areas, searches, date controls, and selects must look editable before interaction. Use the shared dark input surface, two-pixel border, restrained accent edge, and stronger hover/focus response rather than relying on placeholder text to communicate affordance.
- Keep placeholders visibly subordinate to entered text. In the established dark controls, use 25% opacity so examples read as hints rather than existing values; labels, helper text, validation, and focus indicators must remain fully legible.
- Use stable action wording during loading and disabled states.
- Preserve existing validation, authentication, authorization, and request behavior unless the task explicitly includes functional changes.

## 6. Verify the result

- Inspect the route at desktop and narrow phone widths.
- Check every visible state, including default, loading, error, success, and empty states when applicable.
- Confirm keyboard order, accessible names, focus visibility, button contrast, and control sizes.
- Run focused tests, the full relevant test suite, the production build, and `git diff --check`.
- Record what was directly verified, what remains for production QA, and whether any behavior or data changed.

## 7. Use progressive disclosure for advanced tools

- Keep the most common search or action immediately visible.
- Keep short status information beside the primary task when it helps users understand the current result set.
- Group optional sorting, filtering, and assisted-search tools behind one clearly labelled native disclosure when they are not needed for the common path.
- Name the closed control by its outcome, and use one short supporting line to explain what opening it provides.
- Preserve the state and functionality of advanced controls when their disclosure is closed and reopened.

## Sign-in page reference outcome

The accepted sign-in pattern places the active form first, presents Sign in and Google in a compact separated desktop row, stacks them at the phone breakpoint, and places other account tasks in a matching fieldset below the form. Those secondary account-task buttons use an outlined, raised treatment so they remain unmistakably actionable without competing with the primary action. The page also removes redundant status wording, gives empty controls persistent editable-field affordance, and keeps reassurance copy compact on phones.

## Memories workspace reference outcome

The accepted browse pattern keeps Find a Memory and Memory Status visible at all times. The Active and Completed metrics share one row even at narrow phone widths. Due-date sorting and Ask AI are advanced tools grouped within one closed-by-default fieldset labelled `Fine-tune results`; its internal action row keeps a complete button-like radius and border in every interaction state and has a prominent plus/minus indicator. The expanded Filter Due Date and Ask AI fieldsets use matching internal padding, align with the full edges of the action row above, and give Latest, Soonest, and the AI input a shared 46px control height. This allows the first memory to appear earlier without removing access to more precise retrieval and keeps the workspace's fieldset convention intact.

On screens below 760px, consecutive memory cards retain the accepted alternating dark/light surfaces and use a 28px vertical gap with a full-width tapered separator. The separator is strongest at the centre, fades to transparent at both edges, and uses the active accent token with a restrained glow. This gives users a clear end-of-memory boundary without reducing the card width, adding another colour, or changing desktop density.
