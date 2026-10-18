/** Browser speech is local to the stage, including pause, mute and stop controls. */
export class StageNarration {
  #pending = new Set<SpeechSynthesisUtterance>();
  #volume = 1;
  #muted = false;
  speak(text: string): void {
    if (
      this.#muted ||
      !text.trim() ||
      typeof speechSynthesis === "undefined" ||
      typeof SpeechSynthesisUtterance === "undefined"
    )
      return;
    if (this.#pending.size >= 12) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = /[\u3400-\u9fff]/.test(text) ? "zh-CN" : "en-US";
    const voices = speechSynthesis.getVoices();
    const local = voices.find(
      (voice) =>
        voice.lang.replace("_", "-") === utterance.lang && voice.localService,
    );
    if (local) utterance.voice = local;
    utterance.volume = this.#volume;
    utterance.rate = 0.9;
    const release = () => this.#pending.delete(utterance);
    utterance.onend = release;
    utterance.onerror = release;
    this.#pending.add(utterance);
    speechSynthesis.speak(utterance);
  }
  pause(): void {
    if (this.#pending.size) speechSynthesis.pause();
  }
  resume(): void {
    if (this.#pending.size && !this.#muted) speechSynthesis.resume();
  }
  stop(): void {
    if (this.#pending.size && typeof speechSynthesis !== "undefined")
      speechSynthesis.cancel();
    this.#pending.clear();
  }
  setMuted(value: boolean): void {
    this.#muted = value;
    if (value) this.stop();
  }
  setVolume(value: number): void {
    this.#volume = value;
    for (const item of this.#pending) item.volume = value;
  }
}
