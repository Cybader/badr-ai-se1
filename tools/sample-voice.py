# -*- coding: utf-8 -*-
"""Sanity sample: generate two Arabic neural-voice previews for the user to choose."""
import asyncio
from pathlib import Path

import edge_tts

OUT = Path(__file__).resolve().parents[1] / "assets" / "audio"
OUT.mkdir(parents=True, exist_ok=True)

TEXT = ("نظام التشغيل الوسيط بين المستخدم وعتاد الحاسوب: يدير المعالج والذاكرة والملفات والأجهزة. "
        "في هذا الدرس ستتعلّم على ثلاث خطوات: مبادئ أنظمة التشغيل، ثم أهم أوامر Unix، ثم كتابة سكربتات Shell.")

VOICES = {
    "sample-sa-hamed.mp3": "ar-SA-HamedNeural",
    "sample-dz-amina.mp3": "ar-DZ-AminaNeural",
}

async def main():
    for name, voice in VOICES.items():
        tts = edge_tts.Communicate(TEXT, voice=voice, rate="-4%")
        await tts.save(str(OUT / name))
        print("done", name)

asyncio.run(main())
