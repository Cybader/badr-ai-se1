#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Badr AI - SE1
Prepare the supplied lesson slides for the web platform.

- removes the CyberoPlus footer / watermark (bottom strip, adapted per series)
- resizes to 900 px wide, creates a 360 px thumbnail
- converts to WebP (metadata stripped)
- maps every slide to a course section (s1 ... s48)
- writes js/data-images.js and tools/images-manifest.json

Usage:
    python tools/prepare-images.py --src "C:/Users/.../cours/systeme"
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import Iterable

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_SRC = Path(r"C:\Users\Cybader\Desktop\cours\systeme")

# ---------------------------------------------------------------------------
# Editorial mapping: which slide belongs to which course section.
# ---------------------------------------------------------------------------
# Folders whose files are not numbered: explicit teaching order.
ORDERS = {
    "parti1": [
        "ما هو Shell؟",
        "Terminal أم Prompt؟",
        "كيف تفتح Shell وتغلقه؟",
        "أنواع Shell",
        "كيف تدخل إلى Linux؟",
        "كيف يفهم Linux ما تكتبه له؟",
        "كيف نقسّم أي أمر؟",
        "أين الخيار وأين المعامل؟",
        "ثلاث قواعد عند كتابة الأمر",
        "ما هو الأمر (Commande) في Linux؟",
        "ثلاث طبقات في Linux",
        "جلسات متعددة وهويتك",
        "ثلاثة اختصارات لا غنى عنها",
        "كيف تختصر كتابة أسماء الملفات؟",
        "كيف تغيّر كلمة المرور؟",
    ],
    "parti2": [
        "الشجرة (Arborescence)",
        "الملف (Fichier) وجذر الشجرة",
        "المسار (Chemin) والمسار المطلق",
        "المسار النسبي (Chemin relatif)",
        "الصعود بـ .. في المسار النسبي",
        "الرمز ~ بالتفصيل",
        "أين أنا؟ وإلى أين أذهب؟",
        "الرموز الأربعة الخاصة",
        "الخريطة التي يجب أن تبقى في ذهنك",
        "أهم المجلدات ما يجب حفظه",
        "بقية المجلدات في الشجرة",
        "إنشاء المجلدات mkdir",
        "حذف المجلدات",
        "أمثلة تثبّت الفكرة",
        "نظام الملفات (Système de fichiers)",
        "كيف يعرف Linux مكان كل ملف بين آلاف الملفات؟",
        "أنواع الملفات في Linux",
    ],
    "parti3": [
        "خريطة الأوامر في نظرة واحدة",
        "الأمر ls ماذا يوجد هنا؟",
        "الأمر cp نسخ دون المساس بالأصل",
        "نسخ شجرة كاملة cp -r",
        "الأمر mv نقل أو إعادة تسمية",
        "الفرق بين cp و mv",
        "تحذير قد تُكتب فوق ملف موجود",
        "لا تخلط touch أم mkdir",
        "أوامر التعامل مع الملفات",
        "الأمر du كم تحتل هذه الشجرة؟",
        "ما هو الـ i-node؟",
        "كيف أرى رقم الـ i-node؟",
        "كيف يعرف لينكس ملفك؟ بالاسم… أم برقم خفي؟",
        "النظام يعرف الملف برقمه لا باسمه",
        "ثلاثة أنواع رئيسية للملفات في Unix",
        "رموز أنواع الملفات",
    ],
    "parti4": [
        "الروابط (Les liens) نوعان",
        "الرابط الصلب اسمان ومعهما inode واحد",
        "الرابط الرمزي ملف مستقل يحمل مسارًا",
        "مرونة الرابط الرمزي وطريقة إنشائه",
        "حدود الرابط الصلب",
        "المقارنة التي يجب أن تحفظها",
        "ماذا يحدث عند حذف أحد الاسمين؟",
        "هل يمكن أن يكون للملف الواحد أكثر من اسم؟",
        "خريطة خيارات find",
        "الأمر find من أين نبدأ البحث؟",
        "البحث بالاسم -name و -iname",
        "البحث بالتاريخ -atime و -mtime",
        "البحث حسب المالك والمجموعة",
        "الأمر locate البحث بالاسم",
        "ماذا تعني الرموز $ و # في موجّه الأوامر؟",
    ],
    "parti5": [
        "الأمران cat و more عرض محتوى الملف",
        "الأمر head بداية الملف",
        "الأمر tail نهاية الملف",
        "الأمر sort ترتيب الأسطر",
        "الأمر wc العدّ والإحصاء",
        "الأمر cut استخراج جزء من كل سطر",
        "تطبيقات على cut",
        "الأمر paste دمج الأسطر",
        "الأمر tr تحويل الأحرف",
        "الأمر diff مقارنة ملفين",
        "الأمر echo عرض نص على الشاشة",
        "أي أمر يعرض الملف؟",
        "لا تخلط بين هذه الأوامر",
        "الخلاصة للحفظ",
        "الأمر which أين يوجد الأمر؟",
        "الأمر uname معلومات النظام والجهاز",
        "su و sudo ما الفرق؟",
        "reboot و shutdown إعادة التشغيل أم إيقاف التشغيل؟",
    ],
}

# Section assigned to each file (first matching keyword wins).
SECTION_RULES = {
    "parti1": {
        "default": "s9",
        "rules": [("كيف تغيّر كلمة المرور", "s22")],
    },
    "parti2": {
        "default": "s10",
        "rules": [
            ("أنواع الملفات", "s11"),
            ("كيف يعرف Linux مكان", "s11"),
            ("نظام الملفات", "s11"),
        ],
    },
    "parti3": {
        "default": "s12",
        "rules": [
            ("i-node", "s11"),
            ("رقمه لا باسمه", "s11"),
            ("أنواع رئيسية للملفات", "s11"),
            ("رموز أنواع الملفات", "s11"),
            ("كيف يعرف لينكس ملفك", "s11"),
        ],
    },
    "parti4": {
        "default": "s13",
        "rules": [
            ("find", "s17"),
            ("locate", "s17"),
            ("البحث", "s17"),
            ("الرموز $ و #", "s9"),
        ],
    },
    "parti5": {
        "default": "s14",
        "rules": [
            ("which", "s15"),
            ("uname", "s15"),
            ("su و sudo", "s15"),
            ("reboot", "s15"),
        ],
    },
}

# Numbered folders: (first, last, section). A range wins over the default.
NUMBER_RANGES = {
    "parti6": [(1, 10, "s16"), (11, 19, "s17")],
    "PARTI7": [(1, 19, "s18")],
    "PARTI8": [(1, 4, "s19"), (5, 19, "s20"), (20, 20, "s21")],
    "PARTI9": [(1, 10, "s21"), (11, 19, "s22")],
    "PARTI10": [(1, 16, "s23")],
    "parti11": [(1, 1, "s25"), (2, 4, "s24"), (5, 19, "s25")],
    "parti12": [
        (1, 1, "s28"),
        (2, 2, "s26"),
        (3, 3, "s28"),
        (4, 4, "s27"),
        (5, 5, "s29"),
        (6, 6, "s30"),
        (7, 7, "s31"),
        (8, 8, "s32"),
        (9, 10, "s34"),
        (11, 11, "s35"),
        (12, 12, "s37"),
        (13, 13, "s38"),
        (14, 14, "s39"),
        (15, 15, "s40"),
        (16, 16, "s42"),
        (17, 17, "s44"),
        (18, 18, "s46"),
        (19, 19, "s48"),
    ],
}

# Editorial / promotional slides that are not lesson content.
SKIP_KEYWORDS = (
    "ما الموضوع الذي تريد شرحه",
    "ما الأمر الذي تريد شرحه",
    "ما هو الموضوع الذي تريد شرحه",
    "ما الموضوع الذي تريد أن نشرحه",
    "هل استفدت من هذا الجزء",
    "في الجزء الجاي",
    "اضف هدا العنوان",
    "الغلاف",
)

# Exact duplicates (same slide exported twice).
SKIP_FILES = {
    "parti4/ماذا يحدث عند حذف أحد الاسمين؟.png",
}

FOLDER_ORDER = [
    "parti1", "parti2", "parti3", "parti4", "parti5", "parti6",
    "PARTI7", "PARTI8", "PARTI9", "PARTI10", "parti11", "parti12",
]

TITLE_RE = re.compile(r"^\s*(\d+)\s*-\s*")
EXT_RE = re.compile(r"\.(jpe?g|png|webp)$", re.IGNORECASE)


def clean_title(filename: str) -> str:
    stem = EXT_RE.sub("", filename)
    stem = TITLE_RE.sub("", stem)
    return re.sub(r"\s+", " ", stem).strip()


def numbered(filename: str) -> int | None:
    m = re.match(r"^\s*(\d+)", filename)
    return int(m.group(1)) if m else None


def resolve_section(folder: str, filename: str) -> str | None:
    title = clean_title(filename)
    if any(k in filename for k in SKIP_KEYWORDS):
        return None
    if f"{folder}/{filename}" in SKIP_FILES:
        return None
    conf = SECTION_RULES.get(folder)
    if conf:
        for needle, sec in conf["rules"]:
            if needle in filename:
                return sec
        n = numbered(filename)
        if n is not None:
            for first, last, sec in NUMBER_RANGES.get(folder, []):
                if first <= n <= last:
                    return sec
        return conf["default"]
    n = numbered(filename)
    if n is not None:
        for first, last, sec in NUMBER_RANGES.get(folder, []):
            if first <= n <= last:
                return sec
        return None
    return None


def slide_order(folder: str, filename: str, position: int) -> int:
    title = clean_title(filename)
    order = ORDERS.get(folder)
    if order:
        for i, entry in enumerate(order):
            if title.startswith(entry):
                return i
        return 1000 + position
    n = numbered(filename)
    if n is not None:
        return n
    return 1000 + position


def iter_files(folder_path: Path) -> Iterable[Path]:
    return sorted(
        (p for p in folder_path.iterdir() if p.is_file() and p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}),
        key=lambda p: (numbered(p.name) if numbered(p.name) is not None else 10_000, p.name),
    )


def process(src: Path) -> list[dict]:
    records: list[dict] = []
    counters: dict[str, int] = {}
    flags: list[str] = []

    # Start from a clean slate so removed slides do not leave orphan files.
    for folder_name in ("lecons", os.path.join("lecons", "thumbs")):
        folder_path = ROOT / "assets" / folder_name
        if folder_path.is_dir():
            for old in folder_path.iterdir():
                if old.is_file() and old.suffix.lower() == ".webp":
                    old.unlink()

    for folder in FOLDER_ORDER:
        folder_path = src / folder
        if not folder_path.is_dir():
            print(f"!! dossier absent : {folder_path}", file=sys.stderr)
            continue
        ordered = sorted(
            iter_files(folder_path),
            key=lambda p: (slide_order(folder, p.name, 0), p.name),
        )
        for path in ordered:
            section = resolve_section(folder, path.name)
            if not section:
                continue
            counters[section] = counters.get(section, 0) + 1
            sid = f"{section}-{counters[section]:02d}"
            title = clean_title(path.name)

            im = Image.open(path).convert("RGB")
            w, h = im.size
            # Remove the social-network footer / watermark. The first series
            # has a taller green footer with the website URL; the others only
            # carry the @CyberoPlus line in the last 2-3 % of the image.
            crop_ratio = 0.92 if folder == "parti1" else 0.968
            im = im.crop((0, 0, w, int(round(h * crop_ratio))))
            target_w = 900
            target_h = round(im.height * target_w / im.width)
            full = im.resize((target_w, target_h), Image.Resampling.LANCZOS)

            full_path = ROOT / "assets" / "lecons" / f"{sid}.webp"
            thumb_path = ROOT / "assets" / "lecons" / "thumbs" / f"{sid}.webp"
            full_path.parent.mkdir(parents=True, exist_ok=True)
            thumb_path.parent.mkdir(parents=True, exist_ok=True)

            full.save(full_path, "WEBP", quality=84, method=6)
            thumb = full.resize((360, round(target_h * 360 / target_w)), Image.Resampling.LANCZOS)
            thumb.save(thumb_path, "WEBP", quality=74, method=6)

            # Quality check: the last rows should be paper-white. Flag dark ones.
            bottom = full.crop((0, max(0, target_h - 6), target_w, target_h)).convert("L")
            pixels = list(bottom.getdata())
            dark = sum(1 for v in pixels if v < 180) / max(1, len(pixels))
            if dark > 0.06:
                flags.append(f"{sid} ({dark:.0%} sombre en bas) {title}")

            records.append({
                "id": sid,
                "section": section,
                "src": f"assets/lecons/{sid}.webp",
                "thumb": f"assets/lecons/thumbs/{sid}.webp",
                "title": title,
                "w": target_w,
                "h": target_h,
                "source": f"{folder}/{path.name}",
            })
            print(f"{sid:6s} {title[:64]}")

    records.sort(key=lambda r: (int(r["section"][1:]), r["id"]))
    (ROOT / "tools" / "images-manifest.json").write_text(
        json.dumps(records, ensure_ascii=False, indent=1), encoding="utf-8"
    )

    by_section: dict[str, list[dict]] = {}
    for rec in records:
        by_section.setdefault(rec["section"], []).append({
            "id": rec["id"],
            "src": rec["src"],
            "thumb": rec["thumb"],
            "title": rec["title"],
            "w": rec["w"],
            "h": rec["h"],
        })
    ordered_sections = {f"s{i}": by_section[f"s{i}"] for i in range(1, 49) if f"s{i}" in by_section}
    payload = {
        "total": len(records),
        "sections": len(ordered_sections),
        "images": ordered_sections,
    }
    js = (
        "/* Badr AI - SE1 : illustrations des lecons (genere par tools/prepare-images.py). */\n"
        "window.LESSON_IMAGES = " + json.dumps(payload, ensure_ascii=False, indent=1) + ";\n"
        "window.LESSON_IMAGES_BY_ID = {};\n"
        "Object.keys(window.LESSON_IMAGES.images).forEach(function (sec) {\n"
        "  window.LESSON_IMAGES.images[sec].forEach(function (img) {\n"
        "    window.LESSON_IMAGES_BY_ID[img.id] = img;\n"
        "    img.section = sec;\n"
        "  });\n"
        "});\n"
    )
    (ROOT / "js" / "data-images.js").write_text(js, encoding="utf-8")

    print(f"\n{len(records)} images preparees dans {len(ordered_sections)} sections.")
    if flags:
        print("\nA verifier (bas de l'image non blanc) :")
        for f in flags:
            print(" -", f)
    return records


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--src", default=str(DEFAULT_SRC))
    args = parser.parse_args()
    src = Path(args.src)
    if not src.is_dir():
        print(f"Source introuvable : {src}", file=sys.stderr)
        return 1
    process(src)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
