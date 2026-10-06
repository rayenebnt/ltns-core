"""Habillage sonore synthétisé pour la vidéo TikTok (aucun fichier externe).

python3 sfx.py events.json sortie.wav

- pop    : petite bulle quand un encart apparaît
- tick   : clic léger quand l'avatar change de pose
- whoosh : souffle sur les fonds à motifs
Plus une pulsation très discrète en fond, à 100 battements par minute.
"""
import json
import math
import random
import struct
import sys
import wave

RATE = 44100


def main(events_path, out_path):
    data = json.load(open(events_path))
    n = int((data["duration"] + 0.5) * RATE)
    buf = [0.0] * n

    def add(start, samples):
        i0 = int(start * RATE)
        for k, v in enumerate(samples):
            if 0 <= i0 + k < n:
                buf[i0 + k] += v

    def pop():
        # Bulle : sinus qui monte vite en fréquence, décroissance rapide
        out, phase = [], 0.0
        for k in range(int(0.11 * RATE)):
            t = k / RATE
            f = 380 + 900 * (1 - math.exp(-t * 40))
            phase += 2 * math.pi * f / RATE
            out.append(0.32 * math.sin(phase) * math.exp(-t * 32))
        return out

    def tick():
        rnd = random.Random(7)
        return [0.10 * (rnd.random() * 2 - 1) * math.exp(-(k / RATE) * 180) for k in range(int(0.04 * RATE))]

    def whoosh():
        # Bruit filtré qui gonfle puis retombe
        rnd = random.Random(3)
        out, lp = [], 0.0
        length = int(0.42 * RATE)
        for k in range(length):
            x = k / length
            env = math.sin(math.pi * x) ** 2
            lp += 0.08 * ((rnd.random() * 2 - 1) - lp)
            out.append(0.55 * lp * env)
        return out

    sounds = {"pop": pop(), "tick": tick(), "whoosh": whoosh()}
    for e in data["events"]:
        add(max(0.0, e["t"] - (0.08 if e["kind"] == "whoosh" else 0.0)), sounds[e["kind"]])

    # Pulsation de fond : grosse caisse douce
    beat = 60 / 100
    kick = []
    phase = 0.0
    for k in range(int(0.18 * RATE)):
        t = k / RATE
        f = 50 + 70 * math.exp(-t * 30)
        phase += 2 * math.pi * f / RATE
        kick.append(0.16 * math.sin(phase) * math.exp(-t * 14))
    t = 0.35
    while t < data["duration"] - 1.0:
        add(t, kick)
        t += beat

    peak = max(1e-6, max(abs(v) for v in buf))
    gain = min(1.0, 0.9 / peak)
    with wave.open(out_path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(b"".join(struct.pack("<h", int(max(-1, min(1, v * gain)) * 32767)) for v in buf))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
