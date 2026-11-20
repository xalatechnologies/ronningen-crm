# Product visual language

A reusable standard for designing, building, and reviewing digital products.

**Version:** 1.0 · **Reviewed:** 20 November 2026

Use this document for websites, web applications, desktop applications, embedded views, and shared component libraries. Adapt platform-specific behavior to the host. A marketing page, an operational dashboard, and an embedded panel may share foundations without sharing the same layout or density.

**Scope in this repository:** it applies to the whole product: the staff app (`/app/*`), the platform admin (`/admin/*`), the customer portal (`/portal/*`), auth pages and the landing page. The portal's wedding theme (`src/styles/wedding-portal.css`) is a documented brand expression on top of these rules, not an exception to them. See `docs/design/project-profile.md` for this project's profile, audit and rollout status.

## 1. How to adopt this document

1. Complete the project profile with the product and design owners.
2. Map the semantic tokens and component roles to the project's existing system.
3. Record the approved visual direction, supported environments, and any exceptions.
4. Build representative screens with real content and difficult states.
5. Verify them using the review matrix and release checklist in this document.

**Must** describes a requirement after this standard is adopted. **Should** describes the default; a different choice needs a recorded reason. **May** describes an optional treatment. Numerical values explicitly labelled *starter values* are suggestions to validate, not universal requirements. Accessibility criteria retain their own definitions and exceptions.

This is a reusable design standard, not a claim of accessibility conformance or an exhaustive list of every domain-specific requirement. Extend it when the product introduces a new interaction, platform, or risk. Mark inapplicable sections with a reason rather than silently ignoring them.

### Project profile

| Decision | Record for this project |
|---|---|
| Product and audience | Name, primary tasks, expertise, frequency of use, accessibility needs |
| Brand character | Three concrete qualities, with examples of what each means visually |
| Visual direction | Reference screens, approved alternatives, decision owner and date |
| Colour | Brand palette, neutral palette, semantic statuses, data palette |
| Typography | Licensed families, fallback stacks, supported scripts, type roles |
| Shape and depth | Radius scale, borders, elevation, allowed decorative effects |
| Density | Comfortable and/or compact; which contexts use each |
| Themes | Light, dark, system preference, high-contrast and print requirements |
| Platforms | Browsers, operating systems, native hosts, embedded containers |
| Layout | Content widths, navigation patterns, viewport and container behavior |
| Accessibility | WCAG target, platform requirements, assistive technology coverage |
| Internationalization | Locales, right-to-left support, currencies, units, time zones |
| Implementation | Token source, component library, documentation, test tools |
| Ownership | Maintainers, review responsibility, exception review interval |

Keep one completed profile per product. A shared organization-wide foundation may serve several products, with a small explicit profile for each.

## 2. Principles

1. **The task leads the composition.** A person can identify where they are, what matters, and the next useful action.
2. **Hierarchy comes before decoration.** Use placement, grouping, type, and spacing before adding colour, shadows, or animation.
3. **Meaning survives styling changes.** Status, selection, relationships, and progress remain understandable without colour, motion, or images.
4. **Quality includes difficult states.** Loading, failure, long content, missing data, permissions, and recovery receive the same care as the ideal screen.
5. **Consistency comes from shared decisions.** Values live in tokens; behavior and composition live in maintained components and patterns.
6. **The interface respects the person.** Preserve work, honor preferences, avoid surprises, and make consequences clear.
7. **Adaptation preserves capability.** Smaller screens, larger text, different languages, and assistive technology retain the essential task.
8. **Polish is purposeful.** Effects clarify hierarchy or feedback and remain within the product's performance and accessibility budgets.

## 3. Foundations and tokens

### Token architecture

Use three layers:

- **Reference tokens:** raw palette, spacing steps, font families, durations, and geometry.
- **Semantic tokens:** purpose, such as page background, primary text, selected background, or destructive action.
- **Component tokens:** specialized roles where a shared component needs its own controlled behavior.

Screens consume semantic tokens and component APIs. Raw values belong in the authoritative token source. Build outputs, platform mappings, and token documentation should be generated or checked for drift.

The names below are illustrative. Map them to existing names instead of introducing a parallel system.

| Family | Example semantic roles | Required coverage |
|---|---|---|
| Surfaces | `surface.canvas`, `surface.base`, `surface.raised`, `surface.inset`, `surface.overlay` | Every supported theme and host background |
| Text | `text.primary`, `text.secondary`, `text.disabled`, `text.inverse`, `text.link` | Readable pairs for all intended surfaces |
| Borders | `border.subtle`, `border.control`, `border.strong`, `border.invalid` | Grouping, interactive boundaries, validation |
| Actions | `action.primary.*`, `action.secondary.*`, `action.destructive.*` | Default, hover, pressed, focus, disabled, busy |
| Selection | `selection.background`, `selection.text`, `selection.border`, `selection.indicator` | Single, multiple, mixed, focused selection |
| Status | `status.success.*`, `status.warning.*`, `status.danger.*`, `status.info.*`, `status.neutral.*` | Background, text, icon, border; meaningful labels |
| Focus | `focus.color`, `focus.width`, `focus.offset`, `focus.inner` | Light, dark, inverse, invalid, selected, forced colours |
| Type | `type.display`, `type.title`, `type.heading`, `type.body`, `type.label`, `type.caption`, `type.code` | Family, size, weight, line height, tracking |
| Geometry | `space.*`, `radius.*`, `border.width.*`, `control.height.*`, `icon.size.*` | Density, platform, content and hit-area needs |
| Layout | `layout.reading`, `layout.content`, `layout.rail`, `layout.gutter`, `layout.overlay` | Bounds, gutters, sticky offsets, safe areas |
| Depth | `elevation.control`, `elevation.card`, `elevation.overlay`, `elevation.modal` | Shadow and/or border treatment per theme |
| Motion | `motion.duration.*`, `motion.easing.*`, `motion.distance.*` | Standard, reduced motion, user-disabled motion |
| Layers | `layer.base`, `layer.sticky`, `layer.popover`, `layer.modal`, `layer.notification` | A documented stacking and portal strategy |
| Data | `data.categorical.*`, `data.sequential.*`, `data.diverging.*`, `data.missing` | Distinguishable series, non-colour encodings |

Define valid foreground/background combinations, not isolated colours. Test the rendered composition when transparency, imagery, or gradients affect the background. Do not assume two accessible tokens remain accessible in every combination.

Aliases should express an intentional relationship. Avoid several names for the same role unless needed for a documented migration. Remove unused tokens and keep changes traceable.

### Starter values

These are optional starting points for a general-purpose application. Adopt them only after checking the product's content, audience, and platforms. Publish chosen values as tokens.

| Foundation | Starter values | Adjustment rule |
|---|---|---|
| Spacing | 4, 8, 12, 16, 24, 32, 48, 64 CSS px | Use a consistent rhythm; allow tokenized optical corrections |
| Body type | 16px / 1.5, expressed in relative units | Honor text preferences; do not shrink to fit |
| Small supporting type | 13–14px | Product default, not a WCAG minimum; keep essential reading comfortable |
| Page title | 28px on narrow layouts, 34–40px when space permits | Reflow without fixed heights or clipped lines |
| Reading measure | 60–75 characters | Validate for language, font, and content |
| Radius | 4, 8, 12, 16, 24px; fully rounded where meaningful | Match nesting and component purpose |
| Comfortable controls | Approximately 44–48px minimum height | Allow growth for enlarged text and wrapped labels |
| Short transitions | Approximately 100–180ms | Feedback should feel immediate |
| Panel transitions | Approximately 180–280ms | Avoid delaying access to content |

Do not scale every property with viewport width. Large screens usually need better composition and use of space, rather than globally enlarged body text or controls.

## 4. Composition, surfaces, and depth

### Page hierarchy

- Provide a clear page title and recognizable location within the product.
- Make one action visually dominant within each task context. Independent contexts may have their own primary action; avoid competing emphasis in the same group.
- Group by meaning. Use spacing and headings before adding containers.
- Use cards for distinct objects or tasks, not around every paragraph or field.
- Nested surfaces are appropriate for real hierarchy, such as a code sample or preview; do not nest cards solely for decoration.
- Align titles, content, controls, and actions to a deliberate grid. Check icon baselines, label alignment, and optical balance.
- Empty space should clarify relationships; do not create large gaps just to fill a tall viewport.
- Long pages need landmarks and suitable navigation, not an oversized fixed shell.

### Brand expression

A prominent brand surface may be a rail, header, hero, or onboarding panel. Use at most one dominant decorative treatment within a view unless the approved direction deliberately requires more.

Dark rails, gradients, dot grids, glass, and glows are optional brand choices. Do not require them in every product or force them into dense workflows. When adopted:

- Keep decoration behind content and out of the accessibility tree.
- Keep reading and task surfaces quiet.
- Define the complete treatment as reusable tokens or a shared component.
- Check the worst contrast area, including responsive crops and transparent layers.
- Provide an opaque fallback when blur, masks, transparency, or background images are unavailable.
- Avoid decoration that resembles a button, notification, status, or loading indicator.
- Disable expensive effects where needed without removing information.

### Depth and borders

Use a small elevation ladder: base content, controls or raised cards, popovers, then modal surfaces. Elevation communicates stacking and interaction, not importance alone.

- Shadows must not be the only boundary needed to identify a control.
- Dark themes may need borders and tonal differences more than stronger shadows.
- Hover elevation belongs only on interactive surfaces.
- Coordinate inner and outer radii with actual padding and border thickness.
- Avoid shadows clipped by parent overflow and hairline seams between adjoining surfaces.
- Test corners, translucent edges, and strokes at different zoom levels and pixel densities.
- Do not use an enormous `z-index` to bypass a broken stacking context. Define portal placement and nested overlay behavior.

## 5. Typography and content presentation

- Use a small set of type roles. Semantic heading levels describe the document; visual size describes hierarchy. Do not choose heading levels for appearance.
- Use actual text for content. Provide appropriate alternatives for meaningful text embedded in images.
- Make the fallback font usable, including during slow or failed font loading. Check line wraps and layout shift.
- Verify licenses, language coverage, diacritics, punctuation, symbols, and mixed-script content.
- Do not force Latin tracking, capitalization, or font features onto scripts where they harm reading.
- Use uppercase sparingly for short labels, never long instructions or essential paragraphs.
- Keep line height generous enough for accents, descenders, error text, and text-spacing overrides.
- Use tabular numerals for aligned numerical comparison where supported. Use monospace for code or exact strings when it improves recognition.
- Distinguish similar characters in codes and identifiers; allow copying instead of requiring transcription.
- Truncate only when the full value remains accessible through a suitable detail or expansion mechanism. A mouse-only tooltip is insufficient.
- Do not truncate critical amounts, validation instructions, destructive consequences, or the only identifier distinguishing two records.
- Wrap long filenames, URLs, email addresses, and unbroken strings deliberately. Avoid breaking scripts or codes in misleading places.
- Align numbers consistently and include units. Keep positive, negative, zero, unavailable, and not-applicable values distinct.
- Format dates, times, numbers, currency, plural forms, and lists through shared locale-aware utilities.
- Relative dates should have an accessible exact value when precision matters. State the time zone when ambiguity affects the task.
- Use sentence case and direct action verbs. Avoid internal identifiers, generic “Something went wrong” messages, and vague “OK” buttons when a specific verb is available.

## 6. Colour, themes, and selection

### Colour and meaning

- Use semantic status tokens consistently. Brand colour does not automatically mean success.
- Pair meaningful colour with a word, icon, shape, pattern, or position that survives colour-vision differences.
- Distinguish unknown, unavailable, stale, zero, not applicable, and failed. Missing information must not look like a successful result.
- Reserve destructive emphasis for actions with destructive consequences; do not use it for every warning or form error.
- Make links identifiable in context. Do not rely on a subtle colour change alone.
- Keep decorative borders separate from borders needed to identify a field or state.

### Theme behavior

- Treat each supported theme as an intentional design, not a mechanical inversion.
- Check all states, portals, native form controls, browser autofill, text selection, code, charts, media, and embedded content.
- Avoid a flash of the wrong theme during loading or hydration.
- Define system-preference behavior and persistence of explicit user choices.
- Provide theme-appropriate logos and imagery without changing identity.
- A fixed-colour brand surface is acceptable only if all content and states on it pass their checks.
- In forced-colour modes, preserve native adaptation and visible borders, focus, and selected states. Avoid blanket overrides that defeat the user's colours.

### Selection and interaction states

Selection, hover, focus, pressed, and current location are different states. An item may be selected and focused at once.

- Selection needs a persistent indicator and appropriate semantics, such as `aria-selected`, `aria-pressed`, a native checked state, or `aria-current` for location.
- Do not apply these attributes interchangeably; follow the control's actual role.
- Focus must remain visible over selected, invalid, inverse, and disabled-looking surfaces.
- A selected item must still look selected after the pointer leaves.
- Do not use the same treatment for “current page” and “currently hovered page.”
- Define how disabled, busy, error, selection, and focus combine. Validation must not erase focus; busy state must not falsely imply completion.

## 7. Interaction and motion

- Use native buttons for actions and links for navigation. Preserve browser features such as opening links in a new tab.
- Every interactive surface needs an accessible name and a suitable pointer, keyboard, touch, and assistive technology path.
- Match keyboard behavior to the pattern. Ordinary links use Tab; composite widgets may use arrow keys and roving focus. Do not add arrow-key navigation indiscriminately.
- Dragging, swiping, and hover must not be the sole route to essential actions. Provide equivalent controls.
- Do not put essential actions only behind hover. Reveal them on keyboard focus and make them discoverable on touch.
- Avoid nested interactive elements and invisible full-card hit areas that block selection or secondary actions.
- Keep hover and pressed effects small and stable. Do not move surrounding layout or cause nearby targets to shift.
- Motion may explain appearance, spatial relationships, or completion. It must not delay a task or imply progress that is not known.
- Reduced motion must remove unnecessary translation, scaling, parallax, shimmer, and decorative movement. Preserve immediate state feedback.
- Do not make error shaking, bouncing success, confetti, autoplay, or looping effects the default. Provide control for persistent movement when used.
- Animate suitable properties and test low-powered devices. Respect reduced-motion preferences in JavaScript as well as CSS.
- Timed feedback must remain understandable without animation and without watching the screen at the moment it changes.

For custom widgets, use the relevant [WAI-ARIA Authoring Practices pattern](https://www.w3.org/WAI/ARIA/apg/patterns/) and verify its behavior in the actual product. Pattern examples are a starting point, not evidence that an implementation works.

## 8. Required states and recovery

For each component and journey, record applicable states, their copy, visual treatment, available actions, announcements, focus behavior, and recovery. Do not create a single generic empty or error state for unrelated causes.

| State | Required experience | Edge cases to verify |
|---|---|---|
| Initial loading | Stable geometry, useful loading label, scoped busy state | Slow fonts, images and API; narrow viewport; no motion |
| Background refresh | Existing content remains usable; refresh is distinguishable | Refresh fails; values change while focused |
| First-use empty | Explain what belongs here and the next permitted action | User cannot create; setup dependency is missing |
| No results | Show applied search/filter context and a way to change it | Combined filters, hidden scope, stale query |
| Partial data | Identify what loaded, what failed, and affected scope | One panel fails; mixed permissions; truncated response |
| Unknown or stale | Say what is unknown or when data was last updated | No timestamp; offline; missing source |
| Validation error | Preserve input; explain how to correct it near the field | Multiple errors; server validation; conditional fields |
| Saving or processing | Acknowledge the action; prevent unintended duplicates | Slow response; cancellation; page navigation |
| Saved or complete | Confirm the actual persisted outcome | Response lost; downstream work remains pending |
| Failure | State what failed and provide a safe next action | Retry duplicates work; operation partly completed |
| Offline or reconnecting | State connectivity limits and pending changes | Reconnect conflict; failed queued operation |
| Read-only or forbidden | Explain available access and permitted next steps | Permissions change while open; invitation expires |
| Expired session | Provide reauthentication and preserve work where appropriate | Sensitive drafts; account changes; expired upload |
| Missing or deleted record | Explain absence without leaking restricted information | Stale link; deletion in another session |
| Conflict | Show which version changed and safe resolution choices | Simultaneous edits; repeated conflict; lost access |
| Cancelled or undone | Confirm what was cancelled or restored | Cancellation too late; undo expires or fails |
| Limit reached | Explain the limit, scope, and available alternative | Quota, file size, rate limit, unavailable upgrade |

Skeletons should resemble the final layout without pretending to contain real values. Give the region a meaningful loading state; do not announce every skeleton cell. Use determinate progress only when completion is measurable.

Never report success before it is known. When an outcome is uncertain, say so and provide a way to check before repeating a consequential action. Optimistic updates need rollback and an understandable failure path.

## 9. Component and visual-element requirements

### 9.1 Application shell and navigation

- Provide landmarks, a skip link where useful, active location, and a usable page title.
- Check long navigation labels, many items, expanded groups, collapsed rails, permissions, and counters.
- Collapse navigation based on available space. Keep essential context visible and preserve the current destination.
- Do not duplicate navigation in the accessibility tree when desktop and mobile variants coexist.
- Preserve browser history, deep links, relevant filter state, and scroll position when returning from details.
- Breadcrumbs describe hierarchy; tabs switch peer views; steppers describe progress. Do not substitute one for another without a reason.
- Make account, workspace, or organization switching explicit. Clear or relabel old context while new data loads.

### 9.2 Buttons, links, and action groups

- Define primary, secondary, quiet, destructive, icon-only, toggle, and busy variants in the shared library.
- Use concise labels that explain the result. Icon-only controls need an accessible name; a tooltip may supplement it.
- Keep label width stable during busy feedback. A spinner must not replace the only accessible action name.
- Define duplicate-activation behavior and whether cancelling a pending action is possible.
- Explain unavailable actions through adjacent text or a discoverable explanation. A disabled button alone cannot carry that explanation.
- Keep destructive actions separate enough to avoid accidental activation. Confirm based on consequence; offer undo only when restoration is real.
- Let labels wrap or allow controls to grow. Check translations, two-line labels, and enlarged text.
- Warn about a new window or external handoff when it would otherwise surprise the person.

### 9.3 Forms and fields

- Give every field a persistent label. Placeholder text is an example, never the only label.
- Associate instructions, required state, units, and errors programmatically with the control.
- Use native input purpose, autocomplete, and keyboard hints where applicable. Test browser autofill and password managers.
- Validate at helpful moments. Do not mark untouched fields invalid on first render or interrupt composition input.
- Preserve valid values after failure. A summary should link to invalid fields when several errors need correction.
- Distinguish disabled, read-only, required, optional, invalid, and pending validation visually and semantically.
- Check empty, whitespace-only, minimum/maximum, pasted, multiline, Unicode, and unusually long values.
- For numbers and money, handle locale separators, negatives, precision, units, and rounding without silently changing meaning.
- Date and time controls need a clear format, keyboard entry where suitable, invalid-range handling, and explicit time-zone behavior.
- Password visibility controls must retain focus and have clear state labels. Allow paste and password managers; avoid memory or transcription barriers in sign-in and recovery. See [accessible authentication guidance](https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html).
- One-time codes should support whole-code paste, leading zeroes, correction, expiry, resend, and assistive technology. Separate boxes must not force character-by-character navigation.
- File inputs need browse as an alternative to drag and drop, accepted types and limits, per-file progress, cancellation, partial failure, retry, and removal. Handle long names, duplicate names, blocked previews, and rejected files.
- Multi-step forms preserve entered data and explain skipped or optional steps. Going back must not unexpectedly submit, reset, or lose work.
- Autosave must distinguish unsaved, saving, saved, offline, and failed. State whether leaving is safe.

### 9.4 Checkboxes, radios, switches, sliders, and ratings

- Use checkboxes for independent choices, radios for one choice from a set, and switches for a clearly labelled on/off setting.
- Make a switch's activation timing clear: immediate change or part of a form submission.
- Group related choices with a meaningful group label. Support mixed checkbox state when appropriate.
- Keep the visible label clickable without triggering unrelated links inside it.
- Sliders need a readable current value and an alternative for precise entry when precision matters.
- Do not make tiny stars or swatches the only way to select a rating or colour; provide names and keyboard behavior.

### 9.5 Selects, comboboxes, menus, and command palettes

- Use native controls when they meet the task. Custom controls must implement their complete interaction model.
- Distinguish choosing a value from invoking an action; menus and listboxes have different semantics.
- Cover open, closed, focused, selected, disabled, loading, no results, and failed-search states.
- Keep the active option visible, handle long labels and groups, and announce result changes appropriately.
- Remote search must ignore out-of-order responses and preserve the selected value even when it is outside the current result set.
- Virtualization must not break focus, option counts, or access to offscreen choices.
- Portaled lists must respect the current theme, modal boundaries, viewport edges, and mobile keyboard.

### 9.6 Tabs, accordions, trees, and steppers

- Preserve labels and state when content loads. A loading panel must not reset the selected tab.
- Define automatic versus manual tab activation when loading is slow. Navigation that changes routes may be better expressed as links.
- Accordion triggers expose expanded state and control the correct content region.
- Trees need clear hierarchy, expansion, selection, and keyboard behavior; do not confuse expanding a node with choosing it.
- Steps show current, complete, pending, optional, skipped, and failed where applicable. “Complete” must reflect actual completion.
- Provide direct navigation only where allowed. Explain prerequisites for inaccessible steps.
- On narrow screens, preserve step names or a readable progress summary rather than unexplained dots.

### 9.7 Lists, cards, badges, chips, and avatars

- A card or row must have a clear primary destination or action. Separate secondary controls without nested links or buttons.
- Badges communicate status or metadata; chips may filter, select, or remove. Styling must reveal whether an element is interactive.
- Removable chips need a specifically named remove control and predictable focus after removal.
- Check many tags, long names, missing metadata, duplicate titles, and badges with multiword translations.
- Avatars need sensible initials, image-failure fallback, and a readable name nearby when identity matters. Presence cannot rely on a coloured dot alone.
- Do not imply clickability with hover elevation on static content.

### 9.8 Tables and dense data

- Use a semantic table for tabular data. Use an interactive grid only when its keyboard model is needed.
- Define column headers, sorting state, row actions, alignment, units, and unavailable-value notation.
- Cover zero rows, one row, many rows, long cells, loading, partial failure, and unavailable columns.
- On narrow screens, choose a deliberate strategy: prioritized columns, a labelled scroll region, or a relationship-preserving alternative view.
- Make horizontal scrolling discoverable and reachable by keyboard. Keep it within the necessary data region.
- Check sticky headers and columns for overlap, correct backgrounds, borders, and focus visibility.
- Explain selection scope: this page, these results, or all records. Show selected counts and mixed states.
- Batch actions must report partial success and identify records that need attention.
- Preserve focus and a sensible position after sort, deletion, pagination, live updates, and virtualized rendering.
- Do not silently drop selection when filters change or apply an action to invisible records without clear scope.
- Inline editing needs commit, cancel, validation, conflict, and recovery behavior.

### 9.9 Search, filters, pagination, and live content

- Show active filters and a clear reset path. Distinguish no matches from no records and from failed search.
- Define when search runs, whether filters apply immediately, and what persists in the URL.
- Preserve context on return from a result. Avoid resetting scroll or selection unnecessarily.
- Show result counts with their scope. Do not imply an exact total when the service only provides an estimate.
- Pagination must handle deleted last-page records, changed totals, loading, and unavailable next pages.
- Infinite lists need a practical way to reach later content and the page footer; consider an explicit load-more action.
- Live updates must not move a focused row, replace unsaved edits, or flood announcements. Offer a controlled “new items” update when needed.

### 9.10 Dialogs, drawers, sheets, popovers, and tooltips

- Choose modality by behavior. A drawer is not automatically modal; a visually floating panel is not automatically a dialog.
- Modal dialogs need an accessible title, suitable initial focus, contained focus, and an inert background. Restore focus to the trigger or a sensible successor when closed.
- Keep dialogs within the visible viewport. Long content and long actions must remain reachable with zoom and the mobile keyboard open.
- Define Escape, close-button, outside-click, and unsaved-change behavior. Do not silently discard important work.
- Prefer one modal task at a time. If nested overlays are necessary, document focus, dismissal order, and layer behavior.
- Popovers must reposition or resize near edges, remain anchored during scroll, and close predictably if their trigger disappears.
- Tooltips supplement labels; they do not contain essential instructions or interactive controls. Hover/focus content must support dismissal and remain available long enough to inspect.
- If content requires interaction, use an appropriate popover or dialog rather than a tooltip.
- Body scroll locking must not create a horizontal jump or prevent scrolling inside the overlay.

### 9.11 Alerts, banners, toasts, and progress

- Inline messages explain local issues; banners explain broader conditions; toasts acknowledge brief events. Use a dialog only when a decision must interrupt the task.
- Make critical failures and required actions persistent or available in a durable location. A disappearing toast is insufficient.
- Avoid stealing focus for routine updates. Use an appropriate live region, with assertive announcements reserved for urgent situations.
- Toasts must not cover controls, focused items, or mobile navigation. Limit stacking and provide dismissal.
- Essential actions must remain available after a timed message disappears. Pause timing when interaction requires it and offer timing controls where applicable.
- Progress indicators distinguish waiting, running, paused, completed, failed, and cancelled. Do not show a fake percentage or leave a finished job spinning.

### 9.12 Charts, dashboards, maps, and diagrams

- Name the question the visual answers. Label units, time range, filters, source, and freshness where relevant.
- Provide accessible summaries and access to underlying values. Complex visual relationships need a keyboard-usable alternative representation.
- Show the denominator or scope behind percentages and rates. Explain estimates, rounding, and incomplete coverage.
- Distinguish zero from missing data. Gaps, stale series, and unavailable sources must not look healthy or complete.
- Use categorical, sequential, and diverging palettes for the corresponding data relationships.
- Combine colour with labels, patterns, markers, or line styles. Keep legend-to-series mapping stable across refreshes.
- Avoid misleading axes, unexplained truncated ranges, decorative 3D, and area encodings that distort comparison.
- Tooltips must work beyond pointer hover; important values must also be available without them.
- Cover one point, identical values, negative values, outliers, many series, very long labels, and partial datasets.
- Aggregates that suggest investigation should link to records or an explanation of their calculation.
- Maps need alternatives for location search and record access. Diagrams and node editors need non-drag controls and a navigable representation of relationships.

### 9.13 Icons, illustrations, logos, images, and media

- Use one coherent icon family and controlled size and stroke scales. Align optically within controls.
- Decorative icons are hidden from assistive technology; meaningful standalone icons have accessible names.
- Do not use culturally ambiguous icons as the only explanation of a critical action.
- Set image dimensions or aspect ratios to avoid layout shift. Define fit, crop, focal point, and fallback behavior.
- Check transparent assets on every surface and logo legibility in each theme.
- Alternative text describes the image's purpose in context; purely decorative imagery uses an empty alternative.
- Video and audio need accessible controls and applicable captions, transcripts, and description. Do not autoplay sound.
- Carousels, animated media, and previews need accessible navigation and movement controls when applicable.
- Check failed loads, unsupported formats, unavailable thumbnails, low bandwidth, and reduced-data use where supported.

### 9.14 Rich content, code, editors, and previews

- Give prose a deliberate type scale and spacing for headings, lists, quotes, links, tables, code, and attachments.
- Constrain pasted and embedded content so it cannot break the shell or impersonate application controls.
- Preserve semantic reading order and focus inside editor toolbars and embedded interactive content.
- Code and exact-string blocks need readable themes, a local overflow strategy, and usable copy feedback.
- Render diffs with additions/deletions identifiable beyond colour. Offer a readable alternative to dense side-by-side layouts.
- Preview, edit, saved, published, and historical versions must be visibly distinguishable where the product supports them.
- Printable or exported content needs its own layout rules: readable contrast, preserved meaning, sensible page breaks, and no clipped fixed controls.

### 9.15 Specialized patterns

Calendars, timelines, kanban boards, split panes, canvas tools, terminals, and other domain-specific surfaces need their own documented pattern when introduced. At minimum, specify:

- Their data and visual hierarchy, semantics, and accessible alternative.
- Selection, focus, keyboard commands, non-drag operations, and recovery.
- Extreme item counts, long labels, overlapping items, empty regions, and missing data.
- Responsive behavior, zoom, theme adaptation, and performance limits.
- Any justified exception to the general layout or token rules.

Do not force a specialized surface into a generic card or table if that obscures its task.

## 10. Responsive behavior and environmental resilience

- Use content-driven breakpoints and container-aware layout where appropriate. Do not assume viewport width equals available component width.
- Test intermediate widths, split-screen windows, narrow embeds, short laptop heights, portrait, and landscape.
- Use one main page scroll where practical. Nested scrolling needs clear boundaries and keyboard access.
- Sticky headers and action bars must not conceal content or focus. Reserve space and let them return to normal flow when height is limited.
- Account for safe areas, display cutouts, browser chrome, mobile keyboard, and dynamic viewport height.
- Preserve meaningful reading and focus order when rearranging columns. Visual order must not contradict the DOM order.
- Hide decoration before hiding useful content. Do not remove essential actions to make a layout fit.
- Adapt action groups, table strategy, navigation, and overlay geometry explicitly; do not just shrink the desktop view.
- Support right-to-left layout using logical properties. Mirror directional affordances when appropriate, but not logos, media controls, or content whose meaning must stay fixed.
- Isolate mixed-direction strings such as identifiers and addresses so punctuation and numbers remain understandable.
- Test translated text with realistic expansion and scripts without spaces. Avoid concatenated fragments that break grammar.
- Preserve function when fonts, images, blur, custom scrollbars, or decorative assets fail. Document the minimum supported browser and host capabilities.
- Embedded views must respect host dimensions, focus ownership, theme negotiation, scrolling, and link-opening conventions.
- Native desktop surfaces must respect platform conventions for window controls, shortcuts, menus, and focus.

## 11. Accessibility verification

Adopt WCAG 2.2 AA as the default web target unless the project records a different applicable requirement. The checks below are selected acceptance criteria, not a complete conformance audit. Consult the [full WCAG 2.2 standard](https://www.w3.org/TR/WCAG22/).

| Area | Verification |
|---|---|
| Text contrast | At least 4.5:1 for normal text; 3:1 for large text as WCAG defines it. Test actual adjacent colours and applicable exceptions. See [contrast minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). |
| Non-text contrast | Necessary control/state cues and meaningful graphical parts reach 3:1 against adjacent colours, subject to criterion exceptions. Decorative separators do not all need this ratio. See [non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html). |
| Pointer targets | Meet the 24 × 24 CSS px minimum or a documented criterion exception. Prefer approximately 44 × 44 for frequently used touch targets as a product usability choice. Verify expanded hit areas do not overlap. See [target size minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum). |
| Reflow | For ordinary vertically scrolling web content, verify reflow at 320 CSS px without two-dimensional scrolling or loss of function. Genuine two-dimensional content has specific exceptions; keep surrounding UI responsive. See [reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow). |
| Text resizing | Verify text enlargement to 200% without lost content or function, with the criterion's exceptions. See [resize text](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html). |
| Text spacing | Verify overrides of line height 1.5×, paragraph spacing 2×, letter spacing 0.12×, and word spacing 0.16× without lost content or function, where applicable to the script. These are test overrides, not mandatory default styling. See [text spacing](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html). |
| Focus | Focus remains visible and is not entirely hidden by author-created content. Prefer the stronger product rule that the complete control and indicator remain visible. See [focus not obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html). |

Also manually verify names, roles, values, reading order, keyboard completion, focus restoration, status announcements, input assistance, alternatives to dragging, and authentication. Never remove focus outlines without an effective replacement. A translucent glow alone may not provide sufficient contrast; use a reliable outline or other indicator.

Automated scans, contrast checks, and screenshots help find defects but do not establish conformance. Test representative complete journeys with keyboard and screen reader, including failures and recovery.

## 12. Performance and visual stability

- Reserve space for asynchronous content and media. Avoid moving controls after a person starts interacting.
- Scope loading indicators to the work that is actually waiting. Do not block an entire page for an independent panel.
- Avoid unnecessary full-screen rerenders, large blur regions, excessive shadows, and animated lists of unbounded length.
- Virtualize only when needed and preserve access, focus, selection, and a meaningful reading sequence.
- Test slow connections, slow processors, failed assets, and delayed responses with realistic records.
- Never let animation completion determine whether a task is functionally complete.
- Record measurable performance budgets appropriate to the product and measure them on supported devices.

## 13. Implementation and drift prevention

### Shared components

Before building a new element, check for an existing component or pattern. Extend a shared component when the job is the same. Create a distinct component when its behavior or meaning is different; avoid a universal component with dozens of unrelated flags.

Each reusable component should document:

- Purpose, anatomy, variants, sizes, slots, and valid combinations.
- State behavior, interaction model, accessible names, semantics, and focus.
- Responsive behavior, content limits, theme roles, and motion preferences.
- Examples with long content, errors, missing data, and difficult combinations.
- When to use a different component.

Prefer semantic markup and robust platform behavior. A system can wrap native headings, fields, and buttons without banning their underlying semantics. If wrappers are mandatory, ensure they preserve correct HTML and accessible APIs.

### Automated checks

Use tools appropriate to the repository. Do not depend on a particular framework, package manager, file path, or vendor.

| Check | What it should catch |
|---|---|
| Token use | New raw design values outside approved token sources and narrowly justified cases |
| Component use | Duplicated primitives and unsupported variants or imports |
| Token contracts | Missing theme values, broken aliases, invalid names, generation drift |
| Contrast | Approved text, control, focus, selected, status, and data combinations |
| Accessibility | Detectable name, structure, relationship, and interaction defects |
| Interaction tests | Risk-bearing keyboard paths, state transitions, recovery, and focus |
| Visual regression | Representative themes, widths, overlays, and difficult content states |
| Formatting | Consistent locale-aware date, number, duration, and unit utilities |

Static scans should understand syntax where feasible. A fragile text search can flag legitimate data or miss computed values. Pair guardrails with component examples and review; do not mistake passing a scanner for usable design.

### Existing debt and exceptions

- A baseline may record existing violations so new work can improve incrementally.
- New files start without inherited debt. Counts should not increase without a recorded decision.
- Ratchet baselines downward as violations are removed. Do not regenerate them merely to make a check pass.
- Prefer an exception for the smallest declaration or behavior that needs it, rather than excluding an entire file.
- Record the scope, reason, owner, alternatives considered, verification, and review date.
- Fail stale exceptions when their target no longer exists. Review recurring exceptions for a missing token or component capability.
- Data-driven visualization coordinates, user-authored content, platform integration, and specialized canvases may need scoped exceptions. They still need readable, accessible results.
- Exceptions cannot silently waive the project's accessibility target or conceal an unresolved defect.

## 14. Design and review workflow

1. **Understand the task.** Identify the person, context, primary action, consequences, content, and relevant existing patterns.
2. **Choose the level of exploration.** For a new or substantial pattern, compare a minimal adaptation, an established pattern, and a broader improvement. For routine changes within an approved pattern, use that pattern and record any meaningful deviation.
3. **Use realistic content.** Include long names, missing information, many records, translated labels, and actual failure scenarios.
4. **Review the system fit.** Confirm token roles, component reuse, hierarchy, density, and supported themes before polishing effects.
5. **Decide.** The accountable person selects substantial visual directions and tradeoffs. Record the choice where future contributors can find it.
6. **Build complete states.** Implement interactions, responsive behavior, accessibility, and recovery together.
7. **Inspect the rendered result.** Review desktop and narrow layouts in each supported theme, then test the difficult combinations below.
8. **Verify behavior.** Exercise the full task with keyboard and appropriate assistive technology, including interruption and retry.
9. **Record evidence.** Link rendered examples, meaningful checks, decisions, and unresolved issues. Update shared documentation and examples.

Approval of a mockup does not prove that the implementation works. Inspect real rendering and real interaction before release.

## 15. Review matrix

Cover each relevant dimension. Use risk-based combinations rather than attempting every possible permutation. Always include combinations likely to amplify failure, such as enlarged text in a translated mobile dialog or keyboard focus in a selected table row beneath a sticky header.

| Dimension | Representative cases |
|---|---|
| Size | 320px reflow check; 390px phone; intermediate width; 1280px desktop; wide screen; short viewport; narrow embed |
| Theme | Light; dark if supported; system change; forced colours; print/export if applicable |
| Text | Default; 200% enlargement; 400% browser zoom/reflow; text-spacing overrides; fallback font |
| Input | Keyboard only; pointer; touch; supported screen reader; voice input where relevant |
| Content | None; one; many; maximum length; duplicate labels; unbroken strings; missing images; mixed scripts |
| Data | Zero; negative; missing; unknown; stale; partial; outlier; unavailable total |
| Network | Fast; slow; offline; timeout; out-of-order responses; reconnect; uncertain completion |
| Access | Full access; limited role; read-only; expired session; permission revoked while open |
| Preferences | Reduced motion; larger text; compact density if supported; high contrast |
| Language | Primary locale; expanded translation; RTL if supported; local dates, units, and time zones |
| Lifecycle | Direct link; refresh; browser back; restored tab; concurrent edit; deleted current record |
| Assets and host | Blocked font; broken image; unsupported effect; host resize; overlay inside another surface |

### Difficult combinations to inspect

- [ ] Long validation message + narrow screen + mobile keyboard + sticky footer.
- [ ] Selected and invalid control + keyboard focus + dark theme.
- [ ] Dropdown near the bottom edge + zoom + many options.
- [ ] Partial save + lost connection + retry without duplicate consequences.
- [ ] Reauthentication + unsaved form + return to the original context.
- [ ] Live table update + selected rows + active filter + focused row action.
- [ ] Dialog trigger removed while open + safe focus restoration.
- [ ] Missing chart data + zero values + accessible value table.
- [ ] Browser autofill + password manager + theme change.
- [ ] Right-to-left content + email address or identifier + copy action.
- [ ] Failed font or image + layout stability + readable fallback.
- [ ] Print/export + long table + meaning preserved without background colours.

## 16. Release checklist

### Visual and content

- [ ] The task, hierarchy, and next action are clear.
- [ ] Tokens and shared components cover the implementation.
- [ ] Typography, alignment, spacing, radii, borders, iconography, and depth are consistent.
- [ ] Decoration follows the approved profile and does not compete with content.
- [ ] Labels, messages, formatting, units, and numbers are understandable.
- [ ] Long, empty, missing, and maximum-content cases remain usable.

### Behavior and resilience

- [ ] Applicable states in section 8 have been implemented and reviewed.
- [ ] Focus, selection, hover, pressed, disabled, invalid, and busy states work together.
- [ ] Overlays, scrolling, sticky regions, navigation, and back behavior are reliable.
- [ ] Work survives expected interruption; failure and uncertain outcomes have safe recovery.
- [ ] No essential action depends solely on hover, dragging, colour, or motion.

### Accessibility and adaptation

- [ ] Relevant accessibility criteria have been verified; remaining issues are explicit.
- [ ] Keyboard and representative screen-reader journeys include failures and recovery.
- [ ] Supported themes, narrow layouts, short windows, zoom, and enlarged text have been inspected.
- [ ] Reduced motion, forced colours, localization, and platform conventions are respected where applicable.
- [ ] Necessary alternatives exist for charts, diagrams, media, and specialized interactions.

### Evidence and maintenance

- [ ] Appropriate automated checks pass and manual observations are recorded.
- [ ] Visual evidence covers representative states and environments, not only the ideal screen.
- [ ] New tokens, components, patterns, and exceptions are documented.
- [ ] The accountable reviewer has evaluated the rendered result.

## Appendix A. Optional visual direction: restrained depth

This profile preserves the original document's preference for a rich, polished interface while leaving the brand and implementation open. It is an optional starting direction, not a requirement for every project.

- One prominent brand rail, header, or hero with a restrained tonal gradient and optional subtle texture.
- A gently tinted canvas, with clear content surfaces and modest elevation.
- One surface per task where practical; primary actions grouped at a stable, reachable task boundary.
- Generous, legible type with a restrained heading scale and carefully controlled line lengths.
- Primary controls with a subtle highlight or tonal fill; quieter secondary actions; visible field boundaries.
- A small, consistent radius and elevation scale rather than unique treatments per screen.
- Short transitions; optional minimal lift on interactive elements; no decorative looping effects.
- Dark-theme treatment designed separately, with tonal separation and borders rather than bright halos.

If a task footer is sticky, verify available height, focus visibility, and the software keyboard. Allow normal document flow when stickiness makes the task harder. If a brand rail becomes a compact header, retain useful context and remove decorative content first.

## Appendix B. Reusable review record

```text
Surface or journey:
Person and primary task:
Approved profile / pattern:
Decision owner and date:

Components and tokens used or added:
Applicable states and recovery paths:
Content extremes and data cases:
Themes, sizes, languages, and hosts inspected:
Keyboard / assistive technology observations:
Automated checks and visual evidence:

Known issues, severity, owner, and next action:
Exceptions, rationale, and review date:
Review outcome and accountable reviewer:
```
