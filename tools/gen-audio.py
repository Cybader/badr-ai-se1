# -*- coding: utf-8 -*-
"""
Badr AI — توليد الصوت العصبي للدروس (offline MP3 + manifest).
Works offline once generated: the .mp3 files ship with the site, no API at runtime.
Voice: ar-SA-HamedNeural (فصحى واضحة). لتغييره: عدّل VOICE ثم احذف الملفات وأعد التوليد.
"""
import asyncio
import json
from pathlib import Path

import edge_tts

BASE = Path(__file__).resolve().parents[1]
SECTIONS = Path(__file__).resolve().parent / "sections-ar.json"
OUT = BASE / "assets" / "audio"
MANIFEST = BASE / "js" / "audio-map.js"
VOICE = "ar-SA-HamedNeural"
RATE = "-4%"


async def gen(item):
    out = OUT / (item["id"] + ".mp3")
    if out.exists() and out.stat().st_size > 10000:
        return ("skip", item["id"], out.stat().st_size)
    tts = edge_tts.Communicate(item["arText"], voice=VOICE, rate=RATE)
    await tts.save(str(out))
    return ("done", item["id"], out.stat().st_size)


async def main():
    items = json.loads(SECTIONS.read_text(encoding="utf-8"))
    OUT.mkdir(parents=True, exist_ok=True)
    fail = 0
    for it in items:
        try:
            status, sid, size = await gen(it)
            print(status, sid, size, flush=True)
        except Exception as e:  # noqa: BLE001 — keep going, resumable by design
            fail += 1
            print("FAIL", it["id"], type(e).__name__, str(e)[:140], flush=True)
            await asyncio.sleep(2.0)
    # Manifest with only the files that actually exist (idempotent):
    entries = []
    for it in items:
        f = OUT / (it["id"] + ".mp3")
        if f.exists() and f.stat().st_size > 10000:
            entries.append('"%s":"assets/audio/%s.mp3"' % (it["id"], it["id"]))
    MANIFEST.write_text(
        "/* Généré par tools/gen-audio.py — leçons disposant d'une voix neuronale arabe. */\n"
        "window.AUDIO_FILES = {" + ",".join(entries) + "};\n",
        encoding="utf-8",
    )
    print("manifest", MANIFEST.name, len(entries), "entries; failures:", fail, flush=True)


asyncio.run(main())
