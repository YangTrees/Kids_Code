import { afterEach, describe, expect, it, vi } from "vitest";
import { StageNarration } from "./narration";

afterEach(() => vi.unstubAllGlobals());
describe("stage narration", () => {
  function fixture() {
    class Utterance {
      constructor(public text: string) {}
      lang = "";
      volume = 1;
      rate = 1;
      voice: unknown;
      onend?: () => void;
      onerror?: () => void;
    }
    const chineseVoice = { lang: "zh-CN", localService: true };
    const synth = {
      speak: vi.fn(),
      cancel: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      getVoices: () => [chineseVoice],
    };
    vi.stubGlobal("speechSynthesis", synth);
    vi.stubGlobal("SpeechSynthesisUtterance", Utterance);
    return { synth, chineseVoice, player: new StageNarration() };
  }
  it("uses local Chinese speech and applies project volume", () => {
    const { synth, chineseVoice, player } = fixture();
    player.setVolume(0.4);
    player.speak("团团，出发啦！");
    expect(synth.speak).toHaveBeenCalledWith(
      expect.objectContaining({
        text: "团团，出发啦！",
        lang: "zh-CN",
        voice: chineseVoice,
        volume: 0.4,
      }),
    );
    player.pause();
    player.resume();
    expect(synth.pause).toHaveBeenCalledOnce();
    expect(synth.resume).toHaveBeenCalledOnce();
    player.stop();
    expect(synth.cancel).toHaveBeenCalledOnce();
  });
  it("cancels active narration when muted and does not enqueue muted dialogue", () => {
    const { synth, player } = fixture();
    player.speak("出发啦");
    player.setMuted(true);
    player.speak("不应播放");
    expect(synth.cancel).toHaveBeenCalledOnce();
    expect(synth.speak).toHaveBeenCalledTimes(1);
    player.setMuted(false);
    player.speak("继续吧");
    expect(synth.speak).toHaveBeenCalledTimes(2);
  });
  it("keeps dialogue usable on devices without speech synthesis", () => {
    vi.stubGlobal("speechSynthesis", undefined);
    vi.stubGlobal("SpeechSynthesisUtterance", undefined);
    const player = new StageNarration();
    expect(() => {
      player.speak("你好");
      player.stop();
      player.setMuted(true);
    }).not.toThrow();
  });
});
