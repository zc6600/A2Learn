import type { MessageProcessor } from "@a2ui/web_core/v0_9";
import { applyGenerationTheme, getLang } from "./viewer-config";
import {
  clearExamplesUsingComponent,
  getLocalExampleComponents,
  isAudioEnabled,
  markSettingsAsCustom,
  profileFromSettingsInputs,
  setAudioEnabled,
  setExampleComponentInputs,
  syncGenerationSettingsInputs,
} from "./generation-settings";
import {
  MAX_ENABLED_COMPONENTS,
  MAX_EXAMPLE_CASES,
  getGenerationTemplate,
  getStoredGenerationProfile,
  profileForTemplate,
  setStoredGenerationProfile,
  type Lang,
} from "./generation-profile";
import { renderSurfaces } from "./surface-renderer";
import { CHROME_STRINGS, T } from "./viewer-copy";

const LOCAL_STORAGE_KEY = "a2learn_user_api_key";

export type ShellRuntime = {
  container: HTMLElement;
  processor: MessageProcessor<any>;
  modeHint?: string;
};

export type ShellControlOptions = {
  onGenerate: (promptText: string) => void;
  onSwitchLang: (lang: Lang) => void;
  onSelectExample: (id: string) => void;
  onOpenSourceLibrary?: () => void;
  getRuntime: () => ShellRuntime | null;
};

export function getStoredApiKey(): string {
  try {
    return (localStorage.getItem(LOCAL_STORAGE_KEY) || "").trim();
  } catch {
    return "";
  }
}

function setStoredApiKey(key: string): void {
  try {
    if (key) {
      localStorage.setItem(LOCAL_STORAGE_KEY, key.trim());
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

function updateKeyPillStatus(): void {
  const pill = document.getElementById("app-key-pill");
  if (!pill) return;
  const key = getStoredApiKey();
  const lang = getLang();
  if (key) {
    pill.className = "app-key-pill active";
    pill.textContent = lang === "zh" ? "🔑 API Key 已配置" : "🔑 API Key configured";
  } else {
    pill.className = "app-key-pill missing";
    pill.textContent = CHROME_STRINGS[lang].keyPillMissingLabel;
  }
}

export function openSettingsModal(): void {
  const modal = document.getElementById("app-settings-modal");
  const keyInput = document.getElementById("app-api-key-input") as HTMLInputElement | null;
  if (keyInput) keyInput.value = getStoredApiKey();
  syncGenerationSettingsInputs(getStoredGenerationProfile());
  modal?.classList.remove("hidden");
}

function closeSettingsModal(): void {
  document.getElementById("app-settings-modal")?.classList.add("hidden");
}

export function bindShellControls(options: ShellControlOptions): void {
  const {
    onGenerate,
    onSwitchLang,
    onSelectExample,
    onOpenSourceLibrary,
    getRuntime,
  } = options;
  updateKeyPillStatus();

  const settingsBtn = document.getElementById("app-settings-btn");
  const modal = document.getElementById("app-settings-modal");
  const closeBtn = document.getElementById("app-modal-close");
  const saveBtn = document.getElementById("app-modal-save");
  const keyInput = document.getElementById("app-api-key-input") as HTMLInputElement | null;
  const form = document.getElementById("app-prompt-form") as HTMLFormElement | null;
  const promptInput = document.getElementById("app-prompt-input") as HTMLInputElement | null;
  const sourceLibraryButton = document.getElementById("app-source-library-btn");
  const templateInputs = document.querySelectorAll<HTMLInputElement>(".generation-template-input");
  const templatePreviewButtons = document.querySelectorAll<HTMLButtonElement>(".generation-template-preview");
  const componentInputs = document.querySelectorAll<HTMLInputElement>(".generation-component-input");
  const exampleInputs = document.querySelectorAll<HTMLInputElement>(".generation-example-input");
  const keyPill = document.getElementById("app-key-pill");

  settingsBtn?.addEventListener("click", openSettingsModal);
  keyPill?.addEventListener("click", openSettingsModal);
  closeBtn?.addEventListener("click", closeSettingsModal);
  modal?.addEventListener("click", (event) => {
    if (event.target === modal) closeSettingsModal();
  });

  saveBtn?.addEventListener("click", () => {
    if (keyInput) {
      setStoredApiKey(keyInput.value);
      updateKeyPillStatus();
    }
    const profile = setStoredGenerationProfile(profileFromSettingsInputs());
    const audioInput = document.getElementById("generation-audio-enabled") as HTMLInputElement | null;
    if (audioInput) setAudioEnabled(audioInput.checked);
    const narrationButton = document.getElementById("page-narration-button") as HTMLButtonElement | null;
    if (narrationButton) narrationButton.hidden = !isAudioEnabled();
    applyGenerationTheme(profile.themeId, profile.displayMode);
    const runtime = getRuntime();
    if (runtime) renderSurfaces(runtime.container, runtime.processor, runtime.modeHint);
    closeSettingsModal();
  });

  templateInputs.forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked) {
        syncGenerationSettingsInputs(profileForTemplate(input.value));
        document.querySelector<HTMLDetailsElement>(".generation-advanced-settings")?.removeAttribute("open");
      }
    });
  });

  templatePreviewButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const template = getGenerationTemplate(button.dataset.templatePreview || "");
      closeSettingsModal();
      onSelectExample(template.previewExampleId);
    });
  });

  componentInputs.forEach((input) => {
    input.addEventListener("change", () => {
      markSettingsAsCustom();
      if (!input.checked) clearExamplesUsingComponent(input.dataset.componentId || "");
      const current = profileFromSettingsInputs();
      if (input.checked && current.enabledComponents.length > MAX_ENABLED_COMPONENTS) {
        input.checked = false;
        alert(getLang() === "zh" ? `本次最多选择 ${MAX_ENABLED_COMPONENTS} 个组件。` : `Choose at most ${MAX_ENABLED_COMPONENTS} components for one run.`);
      }
      syncGenerationSettingsInputs(profileFromSettingsInputs());
    });
  });

  exampleInputs.forEach((input) => {
    input.addEventListener("change", () => {
      markSettingsAsCustom();
      const selectedProfile = profileFromSettingsInputs();
      const selectedExampleCount = document.querySelectorAll<HTMLInputElement>(".generation-example-input:checked").length;
      if (input.checked && selectedExampleCount > MAX_EXAMPLE_CASES) {
        input.checked = false;
        alert(getLang() === "zh" ? `本次最多选择 ${MAX_EXAMPLE_CASES} 个本地案例。` : `Choose at most ${MAX_EXAMPLE_CASES} local examples for one run.`);
      } else if (input.checked) {
        const requiredComponents = getLocalExampleComponents(input.dataset.exampleId || "");
        const combined = new Set([...selectedProfile.enabledComponents, ...requiredComponents]);
        if (combined.size > MAX_ENABLED_COMPONENTS) {
          input.checked = false;
          alert(getLang() === "zh" ? `该案例需要的组件会超过 ${MAX_ENABLED_COMPONENTS} 个上限。` : `This example would require more than ${MAX_ENABLED_COMPONENTS} components.`);
        } else {
          setExampleComponentInputs(requiredComponents, true);
        }
      }
      syncGenerationSettingsInputs(profileFromSettingsInputs());
    });
  });

  document.querySelectorAll<HTMLInputElement>("input[name='generation-theme'], input[name='generation-display-mode'], #generation-image-limit")
    .forEach((input) => input.addEventListener("change", markSettingsAsCustom));
  document.getElementById("generation-visual-intent")?.addEventListener("input", markSettingsAsCustom);

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const promptText = (promptInput?.value || "").trim();
    if (!promptText) return;
    if (!getStoredApiKey()) {
      openSettingsModal();
      alert(T[getLang()].needApiKeyExplore);
      return;
    }
    onGenerate(promptText);
  });

  sourceLibraryButton?.addEventListener("click", () => onOpenSourceLibrary?.());
  document.querySelectorAll(".app-preset-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const preset = chip.getAttribute("data-preset");
      if (!preset) return;
      if (promptInput) promptInput.value = preset;
      if (!getStoredApiKey()) {
        openSettingsModal();
        alert(T[getLang()].needApiKeyPreset);
        return;
      }
      onGenerate(preset);
    });
  });

  document.getElementById("lang-zh-btn")?.addEventListener("click", () => onSwitchLang("zh"));
  document.getElementById("lang-en-btn")?.addEventListener("click", () => onSwitchLang("en"));
  document.querySelectorAll<HTMLElement>("[data-example-gallery]").forEach((gallery) => {
    gallery.addEventListener("click", (event: MouseEvent) => {
      const card = (event.target as HTMLElement)?.closest<HTMLElement>(".example-card");
      const id = card?.dataset.exampleId;
      if (id) onSelectExample(id);
    });
  });
}

let globalListenersBound = false;
export function bindGlobalListenersOnce(askAgent: (promptText: string) => void): void {
  if (globalListenersBound) return;
  globalListenersBound = true;
  window.addEventListener("a2learn-explore-concept", (event: Event) => {
    const concept = (event as CustomEvent).detail?.concept;
    if (!concept) return;
    const lang = getLang();
    if (!getStoredApiKey()) {
      openSettingsModal();
      alert(T[lang].needApiKeyExplore);
      return;
    }
    askAgent(lang === "zh" ? `详细解释 ${concept}` : `Explain ${concept} in detail`);
  });
  document.addEventListener("click", (event: MouseEvent) => {
    const button = event.composedPath().find(
      (element) => element instanceof HTMLElement && element.classList.contains("tooltip-explore-btn"),
    ) as HTMLElement | undefined;
    const term = button?.getAttribute("data-term");
    if (term) window.dispatchEvent(new CustomEvent("a2learn-explore-concept", { detail: { concept: term } }));
  });
}
