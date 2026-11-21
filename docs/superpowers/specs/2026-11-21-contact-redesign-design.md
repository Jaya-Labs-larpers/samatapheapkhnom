# Contact page redesign — design

## Intent

Full layout redesign of `/contact` (and `/km/contact`). Wireframe confirmed by owner on 2026-11-21. Ideas taken from radiatinghope.org (inquiry routing by topic) and somasurf.org (direct Volunteer/Donate paths), but we show far more contact info than either.

- Goals: topic chosen up front by visible cards; form and contact details side by side on desktop; safeguarding path always visible; works one-handed on mobile.
- Non-goals: new copy, new form fields, API changes, map embed.
- Anti-goals: inventing business content (reply-time promise, consent text, sponsor logos); hiding the safeguarding contact behind a topic choice.

## Constraints

- **Content stays.** Reuse existing strings, topics, hints, safeguarding text and settings (phone, email, hours, address, mapUrl). Owner allowed layout changes only.
- Form logic stays: `/api/contact`, `data-form-type`, per-topic field groups, Turnstile, `forms.css` loaded only with the form (`tests/performance.test.mjs`).
- CSS gzip budget 16.5 KB; `npm run check` must pass.
- English + Khmer (`src/pages/km/contact.astro` uses the same template).

## Approaches

1. **Topic cards driving the existing `<select name="formType">` (chosen).** Cards are buttons that set the select and fire `change`; select remains the value carrier so existing `:has()` rules and submit script are untouched; select shows without JS (same progressive pattern as `TopicPicker`).
2. Rewrite topic state as radios: cleaner markup, but rewrites the CSS `:has()` rules and the submit script. More risk for no visible gain.
3. Keep `TopicPicker` listbox and only restyle the page: lowest effort, but does not deliver the "route cards" idea.

## Design

**Desktop**
1. Hero: H1 (`formPanelTitleGeneral`) + existing `introContact` line.
2. Topic cards, one row of five: General, Partner, Volunteer, Media, Safeguarding (red accent). Label + hint from existing strings. Selected card highlighted.
3. Two columns: form (name, email/phone, preferred contact, topic-specific group, message, Send) | sticky "Reach us" card (phone + hours, email, address + "View on Google Maps" link, social links if present in settings).
4. Full-width safeguarding strip: existing panel title/body/policy link, tap-to-call and mailto buttons. Stays visible for every topic; picking Safeguarding keeps today's behaviour (form simplified, panel emphasised).
5. Closing band: Donate / Volunteer links using existing nav labels; footer restored (`noFooter` removed).

**Mobile**: single column. Order: hero → topic cards (stacked, hint under label) → form (full-width Send) → safeguarding strip → Reach-us block → closing band → footer. Sticky "Reach us" becomes a normal block. Pinned Call button: builder's call (owner suggested-by-assistant, not yet approved).

**Files**: `src/page-templates/sko/Contact.astro` (layout), new `src/components/forms/TopicCards.astro` replacing `TopicPicker` in `ContactForm.astro`, `src/styles/forms.css` (replace `.topic-picker*` and `.contact-*` rules).

## Left to the builder

- Exact card sizing, spacing, and breakpoints (follow `docs/06-design-system.md` tokens; CTAs brand blue).
- Whether `TopicPicker` is deleted or kept for other pages (check usage).
- Social links: only if already in site settings; otherwise omit.
- Photo band: only if an existing site image fits; otherwise omit.

## Dropped from the wireframe (new content needs owner sign-off)

Reply-time promise, privacy-consent checkbox, newsletter, sponsor/press strip.
