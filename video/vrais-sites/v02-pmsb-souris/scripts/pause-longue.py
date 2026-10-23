"""Rétablit la pause longue du script voix (« [long pause] » entre V5 et V6).

video/commun/sync-voice.py met toujours 0,25 s entre deux phrases : la pause longue du script
disparaît, et « Ton métier, ce serait quel geste ? » tomberait sur le rail des réalisations et le
pied de page, la carte de fin n'arrivant qu'à la fin de la question. L'enregistrement original
(voix-originale.mp3) laisse 2,09 s de silence brut à cet endroit, soit 2,0 s une fois les bords
rognés comme le fait sync-voice.py : c'est la valeur par défaut. Ce script, à lancer juste après
sync-voice.py, insère du silence avant la phrase 6 dans voice.mp3 et décale d'autant timing.json et
envelope.json. Il ne touche qu'aux fichiers de ce dossier et ne fait rien si la pause est déjà assez
longue (on peut le relancer sans risque).

  python3 video/commun/sync-voice.py video/vrais-sites/v02-pmsb-souris
  python3 video/vrais-sites/v02-pmsb-souris/scripts/pause-longue.py video/vrais-sites/v02-pmsb-souris

Options : --avant=6 (numéro de la phrase qui suit la pause), --pause=2.0 (silence voulu, en s).
"""
import json
import math
import os
import subprocess
import sys
import wave

RATE = 44100
FPS = 30


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    opt = {a.split("=")[0][2:]: a.split("=")[1] for a in sys.argv[1:] if a.startswith("--") and "=" in a}
    here = os.path.abspath(args[0] if args else ".")
    avant = int(opt.get("avant", 6))
    pause = float(opt.get("pause", 2.0))

    timing_path = os.path.join(here, "timing.json")
    voice_path = os.path.join(here, "voice.mp3")
    env_path = os.path.join(here, "envelope.json")
    if not (os.path.exists(timing_path) and os.path.exists(voice_path)):
        sys.exit("timing.json ou voice.mp3 manquant : lancez d'abord video/commun/sync-voice.py")

    timing = json.load(open(timing_path))
    S = timing["sentences"]
    i = avant - 1
    if not 0 < i < len(S):
        sys.exit(f"Phrase {avant} introuvable ({len(S)} phrases)")
    gap = S[i]["start"] - S[i - 1]["end"]
    if gap >= pause - 0.01:
        print(f"Pause avant la phrase {avant} : {gap:.2f} s, rien à faire")
        return
    # Silence ajouté, arrondi à l'image pour garder l'enveloppe calée
    add = math.ceil((pause - gap) * FPS) / FPS
    at = S[i - 1]["end"] + gap / 2          # au milieu du silence existant

    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", voice_path, "-ac", "1", "-ar", str(RATE), "-f", "s16le", "-"],
                         check=True, capture_output=True).stdout
    cut = int(at * RATE) * 2
    raw = raw[:cut] + b"\x00\x00" * int(round(add * RATE)) + raw[cut:]
    wav = os.path.join(here, ".voice-pause.wav")
    with wave.open(wav, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(raw)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", wav, "-c:a", "libmp3lame", "-b:a", "192k", voice_path], check=True)
    os.remove(wav)

    r3 = lambda v: round(v + add, 3)
    for s in S[i:]:
        s["start"], s["end"] = r3(s["start"]), r3(s["end"])
        s["pauses"] = [[r3(a), r3(b)] for a, b in s.get("pauses", [])]
    json.dump(timing, open(timing_path, "w"), indent=2)

    if os.path.exists(env_path):
        env = json.load(open(env_path))
        k = int(at * FPS)
        env["values"] = env["values"][:k] + [0.0] * int(round(add * FPS)) + env["values"][k:]
        json.dump(env, open(env_path, "w"))

    print(f"Pause avant la phrase {avant} : {gap:.2f} s → {gap + add:.2f} s (+{add:.2f} s de silence)")
    for n, s in enumerate(S, 1):
        print(f"  {n:02d}  {s['start']:6.2f} s → {s['end']:6.2f} s")


if __name__ == "__main__":
    main()
