/**
 * Generates a single self-contained HTML file containing every word of website
 * copy, English beside Khmer, for the SKO team to review without running
 * anything.
 *
 * Generated from src/lib/content/fixtures.ts directly, so it cannot drift from
 * what the site actually shows.
 *
 *   node --experimental-strip-types scripts/content-review.mjs
 */

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const OUT = fileURLToPath(new URL('../SKO-content-review.html', import.meta.url));

const {
  siteSettings,
  programs,
  pages,
  impactStats,
  directorMessage,
  activities,
  partners,
  reports,
  team,
} = await import('../src/lib/content/fixtures.ts');

/* ---------------------------------------------------------------- helpers */

const esc = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

/** Marks placeholders so a reviewer can see instantly what is still missing. */
function mark(text) {
  if (!text) return '<span class="empty">— not written yet —</span>';
  return esc(text)
    .replace(/(\[NEEDS SKO\][^\n]*)/g, '<mark class="need">$1</mark>')
    .replace(/(\[SAMPLE[^\]]*\])/g, '<mark class="sample">$1</mark>')
    .replace(/(\[EXAMPLE\])/g, '<mark class="example">$1</mark>')
    .replace(/\n/g, '<br>');
}

const isPlaceholder = (text) => /\[NEEDS SKO\]|\[SAMPLE|\[EXAMPLE\]|^N\/A$/.test(String(text ?? ''));

/** Portable Text blocks → readable HTML. */
function blocksToText(blocks) {
  if (!blocks || blocks.length === 0) return '';
  return blocks
    .map((block) => {
      if (block._type !== 'block') return '';
      const text = (block.children ?? []).map((span) => span.text ?? '').join('');
      if (!text) return '';
      return block.style === 'h2' ? `<h4>${mark(text)}</h4>` : `<p>${mark(text)}</p>`;
    })
    .join('');
}

/** A field shown in both languages side by side. */
function pair(label, field, { blocks = false } = {}) {
  const en = blocks ? blocksToText(field?.en) : mark(field?.en);
  const km = blocks ? blocksToText(field?.km) : mark(field?.km);
  const kmMissing = blocks ? !field?.km?.length : !field?.km;
  return `
    <div class="field">
      <div class="label">${esc(label)}</div>
      <div class="cols">
        <div class="col"><span class="tag">English</span>${en}</div>
        <div class="col km" lang="km"><span class="tag">ខ្មែរ Khmer</span>${
          kmMissing
            ? '<span class="empty">— Khmer not written. The site shows the English text. —</span>'
            : km
        }</div>
      </div>
    </div>`;
}

function faqBlock(faqs) {
  if (!faqs?.length) return '';
  return `<div class="faqs">${faqs
    .map(
      (faq, index) => `
      <div class="faq">
        <div class="qn">Q${index + 1}</div>
        <div class="qbody">
          ${pair('Question', faq.question)}
          ${pair('Answer', faq.answer)}
        </div>
      </div>`,
    )
    .join('')}</div>`;
}

/* ------------------------------------------------------------------ build */

const sections = [];
let needCount = 0;
const countNeeds = (...values) => {
  for (const value of values) if (isPlaceholder(value)) needCount += 1;
};

// --- Organisation details
countNeeds(
  siteSettings.safeguardingContact?.en,
  siteSettings.donation?.bankAccounts?.[0]?.accountNumber,
);
sections.push(`
<section id="org">
  <h2>1. Organisation details</h2>
  <p class="note">These appear in the header, the footer and on the contact page.</p>
  ${pair('Organisation name', siteSettings.orgName)}
  ${pair('Tagline (the big line on the homepage)', siteSettings.tagline)}
  ${pair('Registration line', siteSettings.registration)}
  ${pair('Address', siteSettings.address)}
  ${pair('Office hours', siteSettings.officeHours)}
  <div class="field">
    <div class="label">Phone / Email / Facebook</div>
    <p>${esc(siteSettings.phone)} &nbsp;·&nbsp; ${esc(siteSettings.email)} &nbsp;·&nbsp; ${esc(
      siteSettings.socials?.[0]?.url ?? '',
    )}</p>
  </div>
  ${pair('Safeguarding contact note (contact page)', siteSettings.safeguardingContact)}
</section>`);

// --- Impact numbers
sections.push(`
<section id="numbers">
  <h2>2. Numbers shown on the site</h2>
  <p class="note">These appear large on the homepage and the Impact page.</p>
  <table>
    <tr><th>Shown</th><th>Label (English)</th><th>Label (ខ្មែរ)</th><th>Small line underneath</th></tr>
    ${impactStats
      .map((stat) => {
        countNeeds(stat.context?.en);
        return `<tr>
          <td class="big">${esc(stat.displayValue ?? stat.value)}</td>
          <td>${mark(stat.label?.en)}</td>
          <td class="km" lang="km">${mark(stat.label?.km)}</td>
          <td>${mark(stat.context?.en)}</td>
        </tr>`;
      })
      .join('')}
  </table>
</section>`);

// --- Programmes
sections.push(`
<section id="programs">
  <h2>3. Our work — the four programme pages</h2>
  ${programs
    .map(
      (program, index) => `
    <article class="card">
      <h3>${index + 1}. ${esc(program.title?.en)} <span class="km" lang="km">/ ${esc(program.title?.km)}</span></h3>
      <div class="url">samatapheapkhnom.org/programs/${esc(program.slug)}/</div>
      ${pair('Summary (shown on cards and in search results)', program.summary)}
      ${pair('Full page text', program.body, { blocks: true })}
    </article>`,
    )
    .join('')}
</section>`);

// --- Pages
sections.push(`
<section id="pages">
  <h2>4. The other pages</h2>
  ${pages
    .map(
      (page) => `
    <article class="card">
      <h3>${esc(page.title?.en)} <span class="km" lang="km">/ ${esc(page.title?.km)}</span></h3>
      <div class="url">samatapheapkhnom.org/${esc(page.slug)}/</div>
      ${pair('Intro', page.intro)}
      ${pair('Page text', page.body, { blocks: true })}
      ${page.faqs?.length ? `<h4 class="sub">Questions on this page</h4>${faqBlock(page.faqs)}` : ''}
    </article>`,
    )
    .join('')}
</section>`);

// --- Donate FAQs
sections.push(`
<section id="donate-faq">
  <h2>5. Questions on the Donate page</h2>
  ${faqBlock(siteSettings.donationFaqs)}
</section>`);

// --- Director
countNeeds(directorMessage.pullQuote?.en, directorMessage.message?.en?.[0]?.children?.[0]?.text);
sections.push(`
<section id="director">
  <h2>6. Message from the Director</h2>
  ${pair('Name', directorMessage.name)}
  ${pair('Title', directorMessage.title)}
  ${pair('Pull quote (one sentence, shown large)', directorMessage.pullQuote)}
  ${pair('Message', directorMessage.message, { blocks: true })}
</section>`);

// --- Everything else
sections.push(`
<section id="rest">
  <h2>7. News posts, partners, reports and team</h2>
  <p class="note">The three news posts below are examples showing the layout. Staff replace them.</p>
  <table>
    <tr><th>News post</th><th>Date</th></tr>
    ${activities
      .map((activity) => {
        countNeeds(activity.title?.en);
        return `<tr><td>${mark(activity.title?.en)}</td><td>${esc(
          (activity.publishedAt ?? '').slice(0, 10),
        )}</td></tr>`;
      })
      .join('')}
  </table>
  <table>
    <tr><th>Partner</th><th>Type</th></tr>
    ${partners
      .map((partner) => {
        countNeeds(partner.name);
        return `<tr><td>${mark(partner.name)}</td><td>${esc(partner.category ?? '')}</td></tr>`;
      })
      .join('')}
  </table>
  <table>
    <tr><th>Report / policy</th><th>Year</th></tr>
    ${reports
      .map((report) => {
        countNeeds(report.title?.en);
        return `<tr><td>${mark(report.title?.en)}</td><td>${esc(report.year ?? '')}</td></tr>`;
      })
      .join('')}
  </table>
  <table>
    <tr><th>Team member</th><th>Role</th></tr>
    ${team
      .map(
        (member) =>
          `<tr><td>${mark(member.name?.en)}</td><td>${mark(member.role?.en)}</td></tr>`,
      )
      .join('')}
  </table>
</section>`);

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>SKO website — content for review</title>
<style>
  :root {
    --blue: #2b4cc7; --blue-dark: #14235c; --ink: #0e1533; --body: #3e4869;
    --muted: #5c6689; --line: #dfe4f2; --tint: #f5f7fd; --aqua: #c3e9e8;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: #eef1f8; color: var(--body);
    font: 17px/1.65 "Noto Sans", system-ui, -apple-system, "Segoe UI", sans-serif;
  }
  .km, [lang="km"] {
    font-family: "Noto Sans Khmer", "Khmer UI", "Leelawadee UI", sans-serif;
    line-height: 1.9;
  }
  .page { max-width: 1080px; margin: 0 auto; padding: 0 20px 100px; }
  header.top { background: #fff; border-bottom: 4px solid var(--blue); padding: 40px 0 30px; margin-bottom: 28px; }
  header.top .page { padding-bottom: 0; }
  h1 { color: var(--ink); font-size: 32px; letter-spacing: -0.02em; margin: 0 0 8px; }
  .sub1 { color: var(--muted); font-size: 16px; margin: 0; }
  h2 {
    color: var(--ink); font-size: 24px; letter-spacing: -0.015em;
    margin: 0 0 6px; padding-top: 4px;
  }
  h3 { color: var(--ink); font-size: 19px; margin: 0 0 4px; }
  h4 { color: var(--ink); font-size: 16px; margin: 18px 0 6px; }
  h4.sub { border-top: 1px solid var(--line); padding-top: 16px; margin-top: 22px; }
  section { background: #fff; border: 1px solid var(--line); border-radius: 12px; padding: 26px 28px; margin-bottom: 20px; }
  .note { color: var(--muted); font-size: 15px; margin: 0 0 18px; }
  .card { border: 1px solid var(--line); border-radius: 10px; padding: 20px 22px; margin-bottom: 18px; }
  .url { font: 500 12px/1.4 ui-monospace, monospace; color: var(--muted); margin-bottom: 14px; }
  .field { margin-bottom: 18px; }
  .label { font-size: 13px; font-weight: 700; color: var(--ink); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 8px; }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  @media (max-width: 760px) { .cols { grid-template-columns: 1fr; } }
  .col { background: var(--tint); border-radius: 8px; padding: 14px 16px; font-size: 16px; }
  .col p { margin: 0 0 10px; }
  .col p:last-child { margin-bottom: 0; }
  .tag { display: block; font: 700 10px/1 ui-monospace, monospace; letter-spacing: 0.1em; color: var(--muted); margin-bottom: 8px; text-transform: uppercase; }
  .empty { color: #929ab5; font-style: italic; }
  mark.need { background: #ffe3e0; color: #8a1c14; padding: 1px 4px; border-radius: 3px; }
  mark.sample { background: #fff0cc; color: #7a5600; padding: 1px 4px; border-radius: 3px; }
  mark.example { background: var(--aqua); color: var(--blue-dark); padding: 1px 4px; border-radius: 3px; }
  table { width: 100%; border-collapse: collapse; margin: 14px 0 22px; font-size: 15px; }
  th { text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); border-bottom: 2px solid var(--line); padding: 8px 10px; }
  td { border-bottom: 1px solid var(--line); padding: 10px; vertical-align: top; }
  td.big { font-size: 22px; font-weight: 700; color: var(--blue); white-space: nowrap; }
  .faq { display: grid; grid-template-columns: 46px 1fr; gap: 12px; border-top: 1px solid var(--line); padding-top: 16px; margin-top: 16px; }
  .qn { font: 700 13px/1.6 ui-monospace, monospace; color: var(--blue); }
  .legend { display: flex; gap: 18px; flex-wrap: wrap; font-size: 14px; margin-top: 18px; }
  .toc { display: flex; gap: 8px; flex-wrap: wrap; margin: 20px 0 0; }
  .toc a { font-size: 14px; font-weight: 600; color: var(--blue); text-decoration: none; background: #fff; border: 1px solid var(--line); border-radius: 99px; padding: 6px 14px; }
  .callout { background: var(--aqua); border-radius: 10px; padding: 18px 20px; margin-top: 20px; color: var(--ink); font-size: 15.5px; }
  @media print {
    body { background: #fff; }
    section, .card { break-inside: avoid; border-color: #ccc; }
    .toc { display: none; }
  }
</style>
</head>
<body>
<header class="top">
  <div class="page">
    <h1>SKO website — content for review</h1>
    <p class="sub1">Every word that will appear on the website, English beside Khmer. Nothing here is live yet.</p>
    <div class="legend">
      <span><mark class="need">[NEEDS SKO]</mark> we need this from you</span>
      <span><mark class="sample">[SAMPLE]</mark> a made-up number, must be replaced</span>
      <span><mark class="example">[EXAMPLE]</mark> shows the layout, staff replace it</span>
    </div>
    <nav class="toc">
      <a href="#org">1. Organisation</a>
      <a href="#numbers">2. Numbers</a>
      <a href="#programs">3. Our work</a>
      <a href="#pages">4. Pages</a>
      <a href="#donate-faq">5. Donate questions</a>
      <a href="#director">6. Director</a>
      <a href="#rest">7. News, partners, reports</a>
    </nav>
  </div>
</header>

<div class="page">
  <div class="callout">
    <strong>How to review this.</strong> Read the English and check it is accurate — it was written
    from the material SKO supplied, so it may have errors of fact or emphasis. Anything highlighted
    in red is something we still need. Where the Khmer column says the Khmer is not written, the
    website will show the English text until someone writes it.
  </div>

  ${sections.join('\n')}

  <section>
    <h2>What we still need</h2>
    <p class="note">Everything highlighted above, plus these files:</p>
    <ul>
      <li>Logo file — SVG or a large PNG</li>
      <li>Three or four photographs for the top of the homepage</li>
      <li>A photograph for each of the five programme pages</li>
      <li>Organisational chart image, plus a written description of who reports to whom</li>
      <li>A photograph of the Director</li>
      <li>Child Protection Policy PDF</li>
      <li>Annual report and financial statement PDFs, if any exist</li>
      <li>Partner logos, with written confirmation each partner allows use</li>
      <li>Donation QR codes and bank account details</li>
      <li>Real programme figures — families supported, children reached, and the period they cover</li>
    </ul>
  </section>

  <p class="note" style="text-align:center;margin-top:30px">
    Generated ${new Date().toISOString().slice(0, 10)} · ${needCount} item(s) flagged as still needed
  </p>
</div>
</body>
</html>`;

writeFileSync(OUT, html, 'utf8');
console.log(`wrote ${OUT}`);
console.log(`  ${programs.length} programmes, ${pages.length} pages, ${impactStats.length} statistics`);
console.log(`  ${needCount} field(s) flagged as still needed`);
