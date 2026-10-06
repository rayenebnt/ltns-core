"""Cale la vidéo sur la voix off ElevenLabs.

Déposer une phrase par fichier dans <épisode>/voice/ : 01.mp3, 02.mp3…,
puis lancer :  python3 video/commun/sync-voice.py video/tiktok-episode-02

Produit :
- voice.mp3      : les phrases mises bout à bout, avec de courts silences
- timing.json    : début, fin et pauses de chaque phrase (sous-titres, poses, encarts)
- envelope.json  : volume de la voix image par image (mouvements de la bouche)
- voice-files.js : signale à tiktok.html que ces fichiers existent
"""
import json
import math
import os
import struct
import subprocess
import sys
import wave

# Dossier de l'épisode (par défaut : le dossier courant)
HERE = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else ".")
VOICE_DIR = os.path.join(HERE, "voice")
LEAD = 0.1    # silence avant la première phrase (s) : l'accroche démarre tout de suite
GAP = 0.25    # silence entre deux phrases (s)
TAIL = 0.6    # fin courte, comme dans tiktok.html : la vidéo reboucle
FPS = 30
RATE = 44100


def decode(path):
    """Décode un fichier audio en échantillons mono 44,1 kHz (liste de float)."""
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(RATE), "-f", "s16le", "-"],
        check=True, capture_output=True,
    ).stdout
    count = len(raw) // 2
    return [v / 32768 for v in struct.unpack(f"<{count}h", raw[: count * 2])]


def trim(samples, threshold=0.012):
    """Retire les silences de début et de fin laissés par ElevenLabs."""
    win = int(0.01 * RATE)
    def loud(i):
        chunk = samples[i:i + win]
        return chunk and max(abs(v) for v in chunk) > threshold
    start = 0
    while start < len(samples) and not loud(start):
        start += win
    end = len(samples)
    while end > start and not loud(end - win):
        end -= win
    pad = int(0.04 * RATE)
    return samples[max(0, start - pad):min(len(samples), end + pad)]


def main():
    # 01.mp3, 02.mp3… jusqu'au premier numéro manquant
    files = []
    while os.path.exists(os.path.join(VOICE_DIR, f"{len(files) + 1:02d}.mp3")):
        files.append(os.path.join(VOICE_DIR, f"{len(files) + 1:02d}.mp3"))
    if not files:
        sys.exit("Aucun fichier dans voice/ : déposez 01.mp3, 02.mp3…")

    track = [0.0] * int(LEAD * RATE)
    sentences = []
    for f in files:
        s = trim(decode(f))
        start = len(track) / RATE
        track += s
        sentences.append({"start": round(start, 3), "end": round(len(track) / RATE, 3)})
        track += [0.0] * int(GAP * RATE)
    track += [0.0] * int(TAIL * RATE)

    # Enveloppe de volume par image, normalisée sur la phrase la plus forte
    hop = RATE // FPS
    env = []
    for i in range(0, len(track), hop):
        chunk = track[i:i + hop]
        env.append(math.sqrt(sum(v * v for v in chunk) / max(1, len(chunk))))
    peak = max(env) or 1
    env = [round(min(1.0, v / peak * 1.15), 3) for v in env]

    wav = os.path.join(HERE, ".voice.wav")
    with wave.open(wav, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(b"".join(struct.pack("<h", int(max(-1, min(1, v)) * 32767)) for v in track))
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", wav, "-c:a", "libmp3lame", "-b:a", "192k",
                    os.path.join(HERE, "voice.mp3")], check=True)
    os.remove(wav)

    # Pauses à l'intérieur de chaque phrase (après une virgule, deux-points…) :
    # les sous-titres s'y accrochent pour changer pile au bon moment
    for s in sentences:
        a, b = int(s["start"] * FPS), int(s["end"] * FPS)
        seg = env[a:b]
        peak = max(seg) or 1
        pauses, run = [], 0
        for k, v in enumerate(seg + [peak]):
            if v < 0.14 * peak:
                run += 1
                continue
            if run >= 3:
                pauses.append([round((a + k - run) / FPS, 3), round((a + k) / FPS, 3)])
            run = 0
        s["pauses"] = pauses

    json.dump({"sentences": sentences}, open(os.path.join(HERE, "timing.json"), "w"), indent=2)
    json.dump({"fps": FPS, "values": env}, open(os.path.join(HERE, "envelope.json"), "w"))
    with open(os.path.join(HERE, "voice-files.js"), "w") as f:
        f.write("// Liste des fichiers de voix disponibles (mise à jour par sync-voice.py)\n")
        f.write("window.VOICE_FILES = ['timing.json', 'envelope.json']\n")

    total = sentences[-1]["end"] + TAIL
    print(f"Voix calée : {len(sentences)} phrases, vidéo de {total:.1f} s")
    for i, s in enumerate(sentences, 1):
        print(f"  {i:02d}  {s['start']:6.2f} s → {s['end']:6.2f} s")


if __name__ == "__main__":
    main()
