import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = await readFile(
  new URL("../src/lib/content/sections.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
  },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(compiled, { module, exports: module.exports });
const sections = module.exports;

/** Values built inside the vm carry its own prototypes; copy them out before deep comparison. */
const plain = (value) => JSON.parse(JSON.stringify(value));

/** Same shorthand as the fixtures: "## " is a heading, "- " a bullet. */
function blocks(lines) {
  return lines.map((raw, index) => {
    const isHeading = raw.startsWith("## ");
    const isBullet = raw.startsWith("- ");
    return {
      _type: "block",
      _key: `b${index}`,
      style: isHeading ? "h2" : "normal",
      ...(isBullet ? { listItem: "bullet", level: 1 } : {}),
      children: [{ _type: "span", text: isHeading ? raw.slice(3) : isBullet ? raw.slice(2) : raw }],
    };
  });
}

const aboutBody = blocks([
  "SKO is a local, neutral, non-profit organization, registered in 2007.",
  "## Our vision",
  "Vulnerable families, children, and young people live with dignity, quality of life, and prosperity.",
  "## Our mission",
  "We work in partnership and collaboration with key stakeholders.",
  "## Our values",
  "Commitment. We work together effectively, in line with our strategic intent.",
  "Hope. We inspire hope in each other.",
  "Integrity. We are honest and transparent in all our actions and decisions.",
  "## Our approach",
  "A first long paragraph about the approach that runs on and on.",
  "A second paragraph about the Family Development Program methodology.",
  "## Where we work",
  "- Phnom Penh, across 14 khans within 105 Sangkat",
  "- Some provinces will be selected for urban poor communities.",
]);

test("the body splits at every heading, keeping what comes before as the lead", () => {
  const split = sections.splitBody(aboutBody);
  assert.equal(split.lead.length, 1);
  assert.deepEqual(
    plain(split.sections.map((section) => section.heading)),
    ["Our vision", "Our mission", "Our values", "Our approach", "Where we work"],
  );
});

test("each section's layout follows its shape", () => {
  const layouts = sections.splitBody(aboutBody).sections.map((section) => section.layout);
  assert.deepEqual(plain(layouts), ["statement", "statement", "terms", "prose", "facts"]);
});

test("no block is dropped or altered by the split", () => {
  const split = sections.splitBody(aboutBody);
  const kept = [...split.lead, ...split.sections.flatMap((section) => section.blocks)];
  const nonHeadings = aboutBody.filter((block) => block.style !== "h2");
  assert.equal(kept.length, nonHeadings.length);
  kept.forEach((block, index) => assert.equal(block, nonHeadings[index]));
});

test("a lead-in term splits only when it is short", () => {
  assert.deepEqual(plain(sections.splitLeadIn("Hope. We inspire hope in each other.")), {
    term: "Hope",
    rest: "We inspire hope in each other.",
  });
  assert.equal(sections.splitLeadIn("This opening sentence is far too long to be a term. Then more."), null);
  assert.equal(sections.splitLeadIn("No full stop at all"), null);
  assert.equal(sections.splitLeadIn("Trailing."), null);
});

test("activity limits let a longer lead-in name a row", () => {
  const text = "Leadership and Management Training for youth and young people. Builds skills.";
  assert.equal(sections.splitLeadIn(text), null);
  assert.equal(sections.splitLeadIn(text, sections.ACTIVITY_LIMITS)?.term, "Leadership and Management Training for youth and young people");
  const rows = blocks(["Home Counseling. One.", "Family Development Program Training. Two.", "Mobile Library. Three."]);
  assert.equal(sections.layoutFor(rows), "prose");
  assert.equal(sections.layoutFor(rows, sections.ACTIVITY_LIMITS), "terms");
});

test("the Khmer full stop also marks a lead-in term", () => {
  const split = sections.splitLeadIn("ក្តីសង្ឃឹម។ យើងជំរុញក្តីសង្ឃឹម");
  assert.equal(split?.term, "ក្តីសង្ឃឹម");
});

test("a long single paragraph is prose, not a statement", () => {
  const long = blocks(["x".repeat(sections.STATEMENT_MAX_CHARS + 1)]);
  assert.equal(sections.layoutFor(long), "prose");
});

test("two term paragraphs are too few for numbered rows", () => {
  assert.equal(sections.layoutFor(blocks(["Hope. One.", "Integrity. Two."])), "prose");
});

test("an empty or missing body yields nothing", () => {
  assert.deepEqual(plain(sections.splitBody(null)), { lead: [], sections: [] });
  assert.equal(sections.splitBody([]).sections.length, 0);
});

const withLink = (block, anchor, href) => {
  const at = block.children[0].text.indexOf(anchor);
  const text = block.children[0].text;
  return {
    ...block,
    markDefs: [{ _key: "l0", _type: "link", href }],
    children: [
      { _type: "span", text: text.slice(0, at) },
      { _type: "span", text: anchor, marks: ["l0"] },
      { _type: "span", text: text.slice(at + anchor.length) },
    ],
  };
};

test("a row that carries a link keeps its rows layout", () => {
  const rows = blocks(["Hope. One.", "Integrity. Two goes here.", "Respect. Three."]);
  rows[1] = withLink(rows[1], "goes", "/faq/");
  assert.equal(sections.layoutFor(rows), "terms");
});

test("formatting other than a link still makes a row prose", () => {
  const rows = blocks(["Hope. One.", "Integrity. Two.", "Respect. Three."]);
  rows[1].children[0].marks = ["strong"];
  assert.equal(sections.layoutFor(rows), "prose");
});

test("the running text after a lead-in keeps its link", () => {
  const row = withLink(blocks(["Integrity. We are honest with families."])[0], "honest", "/about/");
  const split = sections.splitLeadIn("Integrity. We are honest with families.");
  const after = sections.blockAfterLeadIn(row, split.rest);
  assert.equal(after.children.map((child) => child.text).join(""), "We are honest with families.");
  assert.deepEqual(plain(after.children.filter((child) => child.marks).map((child) => child.text)), ["honest"]);
});

function withH3(lines) {
  return blocks(lines.map((line) => line.replace(/^### /, "## "))).map((block, index) =>
    lines[index].startsWith("### ") ? { ...block, style: "h3" } : block,
  );
}

test("a prose section with two or more ### headings splits into chapters", () => {
  const body = withH3(["Intro.", "### Health", "Clinics.", "- Referrals", "### Housing", "Homes."]);
  const { intro, chapters } = plain(sections.splitChapters(body));
  assert.deepEqual(intro.map((block) => block.children[0].text), ["Intro."]);
  assert.deepEqual(chapters.map((chapter) => chapter.heading), ["Health", "Housing"]);
  assert.deepEqual(chapters.map((chapter) => chapter.blocks.length), [2, 1]);
});

test("a single ### heading stays running prose", () => {
  const body = withH3(["### Only one", "Text."]);
  const { intro, chapters } = plain(sections.splitChapters(body));
  assert.equal(chapters.length, 0);
  assert.equal(intro.length, 2);
});
