import {
  renderExamplesStrip,
  type ExampleCardGroup,
  type ExampleCardItem,
} from "@a2learn/viewer-kit/page-shell";
import { LOCAL_EXAMPLES, type Lang } from "./generation-profile";
import { T } from "./viewer-copy";

// Static reference examples bundled at apps/viewer/public/examples/ — viewable
// offline with no API key, so they render even when no backend is deployed.
export function getExampleItems(lang: Lang): ExampleCardItem[] {
  return LOCAL_EXAMPLES.map((example) => ({
    id: example.id,
    title: example.label[lang],
    description: example.description[lang],
    messagesUrl: lang === "en" ? `/examples/en/${example.id}.json` : `/examples/${example.id}.json`,
  }));
}

export function getExampleGroups(lang: Lang): ExampleCardGroup[] {
  const labels = lang === "zh"
    ? {
      paper: { title: "论文详解", description: "从摘要、公式到研究脉络" },
      computing: { title: "计算机专区", description: "算法、前端与 Agent 实战" },
      poetry: { title: "诗词赏析", description: "从词注阅读到意象与情绪的行进" },
    }
    : {
      paper: { title: "Paper deep dives", description: "Abstracts, formulas, and research context" },
      computing: { title: "Computing", description: "Algorithms, frontend, and Agent practice" },
      poetry: { title: "Poetry reading", description: "Move from glossed reading into imagery and feeling" },
    };
  return (["paper", "computing", "poetry"] as const).map((category) => ({
    id: category,
    ...labels[category],
    items: getExampleItems(lang).filter((item) => LOCAL_EXAMPLES.find((example) => example.id === item.id)?.category === category),
  })).filter((group) => group.items.length > 0);
}

export function renderCollapsibleExampleGallery(
  lang: Lang,
  expandedCategory?: ExampleCardGroup["id"],
): string {
  const summary = lang === "zh" ? "浏览精选案例" : "Browse featured cases";
  const detail = lang === "zh"
    ? "展开查看"
    : "Open to explore";

  if (expandedCategory) {
    const groups = getExampleGroups(lang);
    const featuredGroups = groups.filter((group) => group.id === expandedCategory);
    const otherGroups = groups.filter((group) => group.id !== expandedCategory);
    return `${renderExamplesStrip("", featuredGroups)}
      <details class="template-example-gallery">
        <summary><span>${summary}</span><small>${detail}</small></summary>
        ${renderExamplesStrip("", otherGroups, false)}
      </details>`;
  }

  return `<details class="template-example-gallery">
    <summary><span>${summary}</span><small>${detail}</small></summary>
    ${renderExamplesStrip(T[lang].examplesStripTitle, getExampleGroups(lang))}
  </details>`;
}
