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

  constructor(private readonly isEnglish: () => boolean) {}

  stop(): void {
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
    this.activeScript = null;

    const card = document.getElementById("narration-script-overlay");
    if (card) card.style.display = "none";
    this.resetButton();
  }

  async toggle(
    narrationButton: HTMLButtonElement,
    fetchNarrationIfNeeded?: NarrationFetcher,
    audioBaseUrl?: string,
  ): Promise<void> {
    const currentDatasetUrl = narrationButton.dataset.audioUrl || null;

    if (
      this.activeAudio &&
      this.activeUrl &&
      (this.activeUrl === currentDatasetUrl || !fetchNarrationIfNeeded)
    ) {
      if (!this.activeAudio.paused) {
        this.activeAudio.pause();
        this.setPauseState(narrationButton, false);
      } else {
        try {
          await this.activeAudio.play();
          this.setPauseState(narrationButton, true);
        } catch (error) {
          this.showPlaybackError(error);
        }
      }
      return;
    }

    if (currentDatasetUrl) {
      this.stop();
      try {
        await this.play(narrationButton, currentDatasetUrl, "🔊");
        if (this.activeScript) this.renderScriptOverlay(this.activeScript);
      } catch (error) {
        this.showPlaybackError(error);
      }
      return;
    }

    if (!fetchNarrationIfNeeded) return;

    this.stop();
    narrationButton.disabled = true;
    const idleLabel = "🔊";
    narrationButton.textContent = "⏳";
    narrationButton.title = this.isEnglish() ? "Generating narration…" : "正在生成讲稿和音频…";

    try {
      const payload = await fetchNarrationIfNeeded();
      if (!payload.audioUrl) throw new Error("The narration response did not include an audio URL.");

      // API narration responses are commonly API-relative paths. Resolve them
      // against the API origin when viewer and API are deployed separately.
      const fullAudioUrl = new URL(
        payload.audioUrl,
        audioBaseUrl || window.location.href,
      ).toString();
      narrationButton.dataset.audioUrl = fullAudioUrl;
      this.activeScript = payload.script || null;

      await this.play(narrationButton, fullAudioUrl, idleLabel);
      if (payload.script) this.renderScriptOverlay(payload.script);
    } catch (error) {
      this.resetButton(narrationButton, idleLabel);
      this.showPlaybackError(error, true);
    } finally {
      narrationButton.disabled = false;
    }
  }

  private async play(
    narrationButton: HTMLButtonElement,
    url: string,
    idleLabel: string,
  ): Promise<void> {
    const audio = new Audio(url);
    this.activeAudio = audio;
    this.activeUrl = url;

    audio.addEventListener("play", () => this.setPauseState(narrationButton, true));
    audio.addEventListener("pause", () => {
      if (this.activeAudio === audio) this.setPauseState(narrationButton, false);
    });
    audio.addEventListener("ended", () => {
      if (this.activeAudio !== audio) return;
      this.activeAudio = null;
      this.activeUrl = null;
      this.resetButton(narrationButton, idleLabel);
    }, { once: true });

    try {
      await audio.play();
    } catch (error) {
      if (this.activeAudio === audio) {
        this.activeAudio = null;
        this.activeUrl = null;
      }
      throw error;
    }
  }

  private setPauseState(button: HTMLButtonElement, playing: boolean): void {
    button.textContent = playing ? "⏸" : "▶";
    button.title = this.isEnglish()
      ? (playing ? "Pause narration" : "Resume narration")
      : (playing ? "暂停讲稿音频" : "继续播放讲稿");
  }

  private resetButton(button?: HTMLButtonElement, idleLabel = "🔊"): void {
    const target = button || document.getElementById("page-narration-button") as HTMLButtonElement | null;
    if (!target) return;
    target.textContent = idleLabel;
    target.title = this.isEnglish() ? "Play narration" : "播放讲稿";
  }

  private showPlaybackError(error: unknown, narrationGeneration = false): void {
    const message = String(error);
    alert(this.isEnglish()
      ? `${narrationGeneration ? "Narration" : "Audio playback"} failed: ${message}`
      : `${narrationGeneration ? "讲稿生成" : "音频播放"}失败：${message}`);
  }

  private renderScriptOverlay(scriptText: string): void {
    let card = document.getElementById("narration-script-overlay");
    if (!card) {
      card = document.createElement("div");
      card.id = "narration-script-overlay";
      card.className = "a2learn-narration-overlay";
      document.body.appendChild(card);
    }

    const header = document.createElement("div");
    header.className = "a2learn-narration-overlay-head";
    const title = document.createElement("strong");
    title.className = "a2learn-narration-overlay-title";
    title.textContent = this.isEnglish() ? "🎙 Presenter Script" : "🎙 AI 讲稿文稿";
    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.textContent = "✕";
    closeButton.setAttribute("aria-label", this.isEnglish() ? "Close script" : "关闭讲稿");
    closeButton.className = "a2learn-narration-overlay-close";
    closeButton.addEventListener("click", () => {
      card!.style.display = "none";
    });
    header.append(title, closeButton);

    const body = document.createElement("div");
    body.className = "a2learn-narration-overlay-body";
    body.textContent = scriptText;
    card.replaceChildren(header, body);
    card.style.display = "block";
  }
}
