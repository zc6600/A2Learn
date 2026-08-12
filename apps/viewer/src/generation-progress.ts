import type { Lang } from "./generation-profile";
import { T } from "./viewer-copy";

/** Render the online generation state as a quiet, structured surface. */
export function showGenerationProgress(container: HTMLElement, lang: Lang): void {
  const copy = T[lang];
  container.innerHTML = `
    <section class="generation-progress" role="status" aria-live="polite" aria-busy="true">
      <div class="generation-progress-heading">
        <span class="generation-progress-mark" aria-hidden="true"><span></span></span>
        <div>
          <p class="generation-progress-eyebrow">${copy.generationProgressEyebrow}</p>
          <h2 class="generation-progress-title">${copy.generationProgressTitle}</h2>
        </div>
      </div>
      <p class="generation-progress-description">${copy.generationProgressDescription}</p>
      <div class="generation-progress-track" aria-hidden="true"><span></span></div>
      <div class="generation-progress-foot">
        <span class="generation-progress-status"><span class="generation-progress-dot" aria-hidden="true"></span>${copy.generationProgressStatus}</span>
        <span class="generation-progress-mode">${copy.generationProgressMode}</span>
      </div>
    </section>`;
}
