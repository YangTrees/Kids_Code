"""Generate the original built-in sound effects used by the local MVP."""

from __future__ import annotations

import math
import random
import struct
import wave
from pathlib import Path


SAMPLE_RATE = 22_050
OUTPUT_DIR = Path(__file__).parents[1] / "apps" / "web" / "public" / "assets" / "sounds"


def envelope(index: int, total: int, attack: float = 0.035, release: float = 0.18) -> float:
    attack_samples = max(1, int(total * attack))
    release_samples = max(1, int(total * release))
    if index < attack_samples:
        return index / attack_samples
    if index >= total - release_samples:
        return max(0.0, (total - index - 1) / release_samples)
    return 1.0


def tone(
    duration: float,
    frequency_start: float,
    frequency_end: float | None = None,
    harmonics: tuple[tuple[float, float], ...] = (),
    pulse: float = 0.0,
) -> list[float]:
    total = int(duration * SAMPLE_RATE)
    frequency_end = frequency_start if frequency_end is None else frequency_end
    phase = 0.0
    result: list[float] = []
    for index in range(total):
        progress = index / max(1, total - 1)
        frequency = frequency_start + (frequency_end - frequency_start) * progress
        phase += 2 * math.pi * frequency / SAMPLE_RATE
        value = math.sin(phase)
        for multiplier, gain in harmonics:
            value += math.sin(phase * multiplier) * gain
        if pulse:
            value *= 0.72 + 0.28 * math.sin(2 * math.pi * pulse * index / SAMPLE_RATE)
        result.append(value * envelope(index, total))
    return result


def silence(duration: float) -> list[float]:
    return [0.0] * int(duration * SAMPLE_RATE)


def noise(duration: float, seed: int, decay: float = 5.0) -> list[float]:
    rng = random.Random(seed)
    total = int(duration * SAMPLE_RATE)
    return [
        rng.uniform(-1, 1) * math.exp(-decay * index / total) * envelope(index, total, 0.01, 0.25)
        for index in range(total)
    ]


def mix(*tracks: list[float]) -> list[float]:
    total = max(map(len, tracks))
    return [sum(track[index] if index < len(track) else 0.0 for track in tracks) for index in range(total)]


def concat(*tracks: list[float]) -> list[float]:
    return [sample for track in tracks for sample in track]


def write_wave(name: str, samples: list[float]) -> None:
    peak = max(1.0, max(abs(sample) for sample in samples))
    payload = b"".join(
        struct.pack("<h", int(max(-1, min(1, sample / peak * 0.82)) * 32767))
        for sample in samples
    )
    with wave.open(str(OUTPUT_DIR / name), "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(SAMPLE_RATE)
        output.writeframes(payload)


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    effects = {
        "jump.wav": tone(0.28, 330, 880, ((2, 0.18),)),
        "bump.wav": mix(tone(0.18, 150, 75, ((0.5, 0.35),)), noise(0.12, 11, 9)),
        "door-open.wav": concat(tone(0.18, 240, 310), tone(0.34, 310, 520, ((2, 0.15),))),
        "magic.wav": concat(tone(0.16, 523), tone(0.16, 659), tone(0.28, 784, 1047, ((2, 0.15),))),
        "pop.wav": tone(0.12, 620, 180, ((2, 0.12),)),
        "whoosh.wav": mix(tone(0.42, 180, 920, ((2, 0.08),)), noise(0.42, 22, 2.5)),
        "bell.wav": mix(tone(0.62, 880, 874), tone(0.62, 1760, 1748), tone(0.62, 2640, 2622)),
        "drum.wav": mix(tone(0.24, 130, 58, ((0.5, 0.4),)), noise(0.08, 33, 14)),
        "splash.wav": mix(tone(0.38, 260, 110), noise(0.38, 44, 5)),
        "sparkle.wav": concat(tone(0.12, 988), silence(0.035), tone(0.12, 1319), silence(0.035), tone(0.24, 1568)),
        "countdown.wav": concat(tone(0.1, 440), silence(0.08), tone(0.1, 440), silence(0.08), tone(0.22, 880)),
        "game-over.wav": concat(tone(0.2, 392), tone(0.2, 330), tone(0.42, 262, 196, ((0.5, 0.15),))),
    }
    for filename, samples in effects.items():
        write_wave(filename, samples)
    print(f"Generated {len(effects)} sound effects in {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
