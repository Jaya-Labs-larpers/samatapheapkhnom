# Cookie consent bar — design

## Intent

Before launch, replace the plain Accept/Decline bar with a standard three-button consent bar plus a Preferences panel. Purpose: learn how many people visit and what they interact with (Google Analytics via GTM `GTM-MSXSCPTS`), with honest, friendly wording and a real choice.

- Goals: Accept all / Reject optional / Preferences; per-category control; footer "Cookie settings" reopens it; English + Khmer.
- Non-goals: marketing/ads category, consent logs, third-party consent service, Google Consent Mode.
- Anti-goals: wording that says cookies are needed for the site to work (untrue, and pressures consent); Reject harder to find than Accept; GA loading before consent.

## Approaches

1. **Upgrade existing `CookieSettings.astro` (chosen).** No new packages, keeps current storage and lazy GTM loading.
2. Open-source library (vanilla-cookieconsent): extra dependency and styling overrides for one category.
3. Paid service (Cookiebot/CookieYes): monthly cost, extra outside script, slower pages.

## Design

**Bar** (first visit, fixed to bottom, white, same as today):
- Message + "Privacy" link to `/privacy`.
- Buttons: **Preferences** (outline), **Reject optional**, **Accept all**. Reject and Accept get identical styling (solid brand blue) so neither is favoured.

**Preferences panel** (expands inside the bar; footer "Cookie settings" opens it directly):
- Necessary — "Remembers your cookie choice." — shown as *Always on*, not switchable.
- Analytics — "Google Analytics: which pages people visit and what they click." — switch, reflects saved choice, off by default.
- **Save choices** button.

**Behaviour:**
- Storage unchanged: `localStorage['sko-analytics-choice']` = `accepted` | `declined`. Existing visitors keep their choice; no migration.
- Accept all / Save with Analytics on → `accepted`, GTM loads (existing lazy loader).
- Reject optional / Save with Analytics off → `declined`.
- Turning Analytics off after GTM loaded: delete `_ga` / `_ga_*` cookies, then reload (reload already happens today).
- Keyboard: focus moves into the panel on open and back to the footer link on close; switch uses `role="switch"`.
- Still only rendered on production (`gtmId` set).

**Copy (needs owner sign-off):**

| | English | Khmer (draft, needs native review) |
|---|---|---|
| Message | We use optional cookies to see which pages help people most, so we can improve this site. The site works fully either way. | យើងប្រើខូគីជាជម្រើស ដើម្បីដឹងថាទំព័រណាមានប្រយោជន៍បំផុតសម្រាប់អ្នកអាន ដើម្បីកែលម្អគេហទំព័រនេះ។ គេហទំព័រដំណើរការពេញលេញទោះបីអ្នកជ្រើសរើសបែបណាក៏ដោយ។ |
| Accept all | Accept all | យល់ព្រមទាំងអស់ |
| Reject optional | Reject optional | បដិសេធខូគីជាជម្រើស |
| Preferences | Preferences | ការកំណត់ |
| Necessary | Necessary — remembers your cookie choice. Always on. | ចាំបាច់ — ចងចាំជម្រើសខូគីរបស់អ្នក។ បើកជានិច្ច។ |
| Analytics | Analytics — Google Analytics: which pages people visit and what they click. | ការវិភាគ — Google Analytics៖ ទំព័រណាដែលអ្នកអានចូលមើល និងអ្វីដែលពួកគេចុច។ |
| Save | Save choices | រក្សាទុកជម្រើស |

## Left to the builder

Exact spacing/breakpoints (stack buttons full-width on phones), switch styling within the design tokens, focus-ring details.
