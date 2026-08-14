import type { Lang } from "./generation-profile";
import { T } from "./viewer-copy";

export type NarrationPayload = {
  script?: string;
  audioUrl: string;
};

type NarrationFetcher = () => Promise<NarrationPayload>;

/** Owns narration playback state independently from the viewer bootstrap flow. */
export class NarrationController {
  private activeAudio: HTMLAudioElement | null = null;
  private activeUrl: string | null = null;
  private activeScript: string | null = null;
  private operationVersion = 0;

  constructor(private readonly getLanguage: () => Lang) {}

  private get t() {
    return T[this.getLanguage()];
  }

  stop(): void {
    this.operationVersion += 1;
    this.stopPlayback();
  }

  private stopPlayback(): void {
    if (this.activeAudio) {
      try {
        this.activeAudio.pause();
        this.activeAudio.currentTime = 0;
      } catch {
        // The audio element may already have been detached or invalidated.
      }
      this.activeAudio = null;
    }
    this.activeUrl = null;

    const result = document.getElementById("narration-result");
    if (result) result.hidden = true;
    this.resetButton();
  }

  /** Stop playback and remove the audio source when the displayed document changes. */
  resetForDocument(button?: HTMLButtonElement | null): void {
    this.stop();
    this.activeScript = null;
    const target = button || document.getElementById("page-narration-button") as HTMLButtonElement | null;
    if (!target) return;
    delete target.dataset.audioUrl;
    target.hidden = true;
    target.disabled = false;
  }

  async toggle(
    narrationButton: HTMLButtonElement,
    fetchNarrationIfNeeded?: NarrationFetcher,
    audioBaseUrl?: string,
  ): Promise<void> {
    const operationVersion = this.operationVersion;
    const currentDatasetUrl = narrationButton.dataset.audioUrl || null;

    if (
      this.activeAudio &&
      this.activeUrl &&
      (this.activeUrl === currentDatasetUrl || !fetchNarrationIfNeeded)
    ) {
      const result = document.getElementById("narration-result");
      if (result && result.hidden) {
        result.hidden = false;
      }
      if (!this.activeAudio.paused) {
        this.activeAudio.pause();
        this.setPauseState(narrationButton, false);
      } else {
        try {
          await this.activeAudio.play();
          if (operationVersion !== this.operationVersion) return;
          this.setPauseState(narrationButton, true);
        } catch (error) {
          if (operationVersion === this.operationVersion) this.showPlaybackError(error);
        }
      }
      return;
    }

    if (currentDatasetUrl) {
      const scriptText = this.activeScript || undefined;
      this.stopPlayback();
      try {
        this.showAudioResult(currentDatasetUrl, scriptText);
        await this.play(narrationButton, currentDatasetUrl, "🔊");
        if (operationVersion !== this.operationVersion) return;
      } catch (error) {
        if (operationVersion === this.operationVersion) this.showPlaybackError(error);
      }
      return;
    }

    if (!fetchNarrationIfNeeded) return;

    this.stopPlayback();
    narrationButton.disabled = true;
    const idleLabel = "🔊";
    narrationButton.textContent = "⏳";
    narrationButton.title = this.t.generatingNarration;

    try {
      const payload = await fetchNarrationIfNeeded();
      if (operationVersion !== this.operationVersion) return;
      if (!payload.audioUrl) throw new Error("The narration response did not include an audio URL.");

      // API narration responses are commonly API-relative paths. Resolve them
      // against the API origin when viewer and API are deployed separately.
      const fullAudioUrl = new URL(
        payload.audioUrl,
        audioBaseUrl || window.location.href,
      ).toString();
      narrationButton.dataset.audioUrl = fullAudioUrl;
      this.activeScript = payload.script || null;
      this.showAudioResult(fullAudioUrl, payload.script);

      await this.play(narrationButton, fullAudioUrl, idleLabel);
      if (operationVersion !== this.operationVersion) return;
    } catch (error) {
      if (operationVersion !== this.operationVersion) return;
      this.resetButton(narrationButton, idleLabel);
      this.showPlaybackError(error, true);
    } finally {
      if (operationVersion === this.operationVersion) narrationButton.disabled = false;
    }
  }

  private async play(
    narrationButton: HTMLButtonElement,
    url: string,
    idleLabel: string,
  ): Promise<void> {
    const audio = this.getResultAudio(url) || new Audio(url);
    this.activeAudio = audio;
    this.activeUrl = url;

    try {
      await audio.play();
    } catch (error) {
      if (this.activeAudio === audio) {
        this.activeAudio = null;
        this.activeUrl = null;
        this.resetButton(narrationButton, idleLabel);
        throw error;
      }
    }
  }

  private setPauseState(button: HTMLButtonElement, playing: boolean): void {
    button.textContent = playing ? "⏸" : "▶";
    button.title = playing ? this.t.pauseNarration : this.t.resumeNarration;
  }

  private resetButton(button?: HTMLButtonElement, idleLabel = "🔊"): void {
    const target = button || document.getElementById("page-narration-button") as HTMLButtonElement | null;
    if (!target) return;
    target.textContent = idleLabel;
    target.title = this.t.playNarration;
  }

  showAudioResult(audioUrl: string, scriptText?: string): void {
    const result = document.getElementById("narration-result");
    if (!result) return;

    const header = document.createElement("div");
    header.className = "a2learn-narration-result-head";
    const title = document.createElement("strong");
    title.className = "a2learn-narration-result-title";
    title.textContent = this.t.presenterScriptTitle;
    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "a2learn-narration-result-close";
    closeButton.textContent = "✕";
    closeButton.setAttribute("aria-label", this.t.closeScript);
    closeButton.onclick = () => this.stop();
    header.append(title, closeButton);

    const audio = document.createElement("audio");
    audio.controls = true;
    audio.preload = "metadata";
    audio.src = audioUrl;
    audio.setAttribute("aria-label", this.t.playNarration);
    audio.onplay = () => {
      this.activeAudio = audio;
      this.activeUrl = audioUrl;
      const button = document.getElementById("page-narration-button") as HTMLButtonElement | null;
      if (button) this.setPauseState(button, true);
    };
    audio.onpause = () => {
      if (this.activeAudio !== audio) return;
      const button = document.getElementById("page-narration-button") as HTMLButtonElement | null;
      if (button) this.setPauseState(button, false);
    };
    audio.onended = () => {
      if (this.activeAudio !== audio) return;
      this.activeAudio = null;
      this.activeUrl = null;
      this.resetButton();
    };
    audio.onerror = () => {
      if (this.activeAudio !== audio) return;
      this.activeAudio = null;
      this.activeUrl = null;
      this.resetButton();
      const err = audio.error;
      const lang = this.getLanguage();
      let reason = lang === "zh" ? "音频无法加载。" : "The audio could not be loaded.";
      if (err) {
        if (err.code === 2) reason = lang === "zh" ? `网络加载失败：${audioUrl}` : `Network error: ${audioUrl}`;
        else if (err.code === 3) reason = lang === "zh" ? `音频解码失败：${audioUrl}` : `Decode error: ${audioUrl}`;
        else if (err.code === 4) reason = lang === "zh" ? `音频资源未找到或格式不支持：${audioUrl}` : `Audio not found or unsupported (404): ${audioUrl}`;
        else if (err.message) reason = `${err.message} (${audioUrl})`;
      }
      this.showPlaybackError(reason);
    };

    result.replaceChildren(header, audio);
    if (scriptText) {
      this.activeScript = scriptText;
    }
    const content = scriptText || this.activeScript;
    if (content) {
      const body = document.createElement("div");
      body.className = "a2learn-narration-result-body";
      body.textContent = content;
      result.appendChild(body);
    }
    result.hidden = false;
  }

  private getResultAudio(url: string): HTMLAudioElement | null {
    const result = document.getElementById("narration-result");
    const audio = result?.querySelector("audio") as HTMLAudioElement | null;
    if (!audio) return null;
    const resolvedUrl = new URL(url, window.location.href).toString();
    return audio.src === resolvedUrl ? audio : null;
  }

  private showPlaybackError(error: unknown, narrationGeneration = false): void {
    const message = String(error);
    const prefix = narrationGeneration ? this.t.narrationFailedPrefix : this.t.playbackFailedPrefix;
    alert(`${prefix}${message}`);
  }

}
