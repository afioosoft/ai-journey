#!/usr/bin/env python3
"""Build the language packs for the app.

Reads   i18n/keys.json        every translatable Arabic text, by key (written by transform.mjs)
        i18n/<lang>.json      the translations: {key: {"ar": Arabic text, "t": translation}}
        monthly.json          the monthly content (Arabic)
Writes  lang/<lang>.js        the pack the app loads when that language is picked
        monthly.<lang>.json   the monthly content in that language
and updates i18n/<lang>.json: new Arabic texts are added with an empty "t", texts that are
gone from the app are removed, and texts whose Arabic changed are emptied.

A text with an empty "t" shows in Arabic until it is translated. Run from the repo root:
    python3 i18n/build.py            (all languages)
    python3 i18n/build.py en         (one language)
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
I18N = os.path.join(ROOT, "i18n")
LANGS = ["en", "de", "fr"]
PH = re.compile(r"\{\d+\}")
TAG = re.compile(r"</?([a-z]+)")
ARABIC = re.compile("[؀-ۿ]")


def key(s):
    """FNV-1a 32-bit over UTF-16 code units, base 36: the same key the app computes (txh)."""
    b = s.encode("utf-16-le")
    h = 0x811C9DC5
    for i in range(0, len(b), 2):
        h ^= b[i] | (b[i + 1] << 8)
        h = (h * 0x01000193) & 0xFFFFFFFF
    digits, out = "0123456789abcdefghijklmnopqrstuvwxyz", ""
    while True:
        out = digits[h % 36] + out
        h //= 36
        if not h:
            return out


def load(path, default=None):
    if not os.path.exists(path):
        return default
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def save_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1, sort_keys=True)
        f.write("\n")


def check(k, ar, t):
    """Problems that would break the app: placeholders it does not have, changed markup, Arabic left over."""
    out = []
    if not set(PH.findall(t)) <= set(PH.findall(ar)):
        out.append("placeholder not in the Arabic")
    if sorted(TAG.findall(ar)) != sorted(TAG.findall(t)):
        out.append("tags differ from the Arabic")
    if ARABIC.search(t) and k != key("0123456789"):
        out.append("still has Arabic")
    return out


def monthly(lang, packs):
    src = load(os.path.join(ROOT, "monthly.json"))
    missing = []

    def tr(x, field=None):
        if isinstance(x, str):
            if field in ("id", "month", "kind", "icon", "about") or not ARABIC.search(x):
                return x
            s = x.strip()
            v = packs.get(key(s))
            if v:
                return x.replace(s, v)
            missing.append(s)
            return x
        if isinstance(x, list):
            return [tr(v) for v in x]
        if isinstance(x, dict):
            return {k: tr(v, k) for k, v in x.items()}
        return x

    out = tr(src)
    out["about"] = f"{lang} version of monthly.json, made by i18n/build.py from the translations in i18n/{lang}.json. Edit monthly.json, then run the build."
    with open(os.path.join(ROOT, f"monthly.{lang}.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
        f.write("\n")
    return missing


def build(lang, keys):
    path = os.path.join(I18N, f"{lang}.json")
    old = load(path, {})
    new, todo, changed, problems = {}, 0, 0, 0
    for k, ar in keys.items():
        e = old.get(k)
        if e and e.get("ar") != ar:
            e, changed = {"ar": ar, "t": ""}, changed + 1
        e = e or {"ar": ar, "t": ""}
        new[k] = e
        if not e["t"]:
            todo += 1
            continue
        for p in check(k, ar, e["t"]):
            problems += 1
            print(f"  {lang} {k}: {p}\n     ar: {ar[:70]}\n     {lang}: {e['t'][:70]}")
    removed = len(set(old) - set(keys))
    save_json(path, new)
    m = {k: e["t"] for k, e in sorted(new.items()) if e["t"]}
    os.makedirs(os.path.join(ROOT, "lang"), exist_ok=True)
    with open(os.path.join(ROOT, "lang", f"{lang}.js"), "w", encoding="utf-8") as f:
        f.write("/* Made by i18n/build.py from i18n/%s.json. Do not edit by hand. */\n" % lang)
        f.write("window.I18N={lang:%s,m:%s};\n" % (json.dumps(lang), json.dumps(m, ensure_ascii=False, separators=(",", ":"))))
    miss = monthly(lang, m)
    print(f"{lang}: {len(m)} of {len(keys)} translated, {todo} to do, {changed} changed Arabic, {removed} removed, {problems} problems, {len(miss)} monthly texts to do")
    return problems


if __name__ == "__main__":
    keys = load(os.path.join(I18N, "keys.json"))
    langs = sys.argv[1:] or [l for l in LANGS if os.path.exists(os.path.join(I18N, f"{l}.json"))]
    bad = sum(build(l, keys) for l in langs)
    sys.exit(1 if bad else 0)
