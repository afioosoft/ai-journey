# Languages

The app is written in Arabic. English, German and French are added on top, without
changing how the Arabic app works. The 🌐 button at the top of the home screen picks the language;
the choice is saved on the device (`ai-journey-lang` in localStorage) and the page reloads.

## How it works

- Every Arabic text in the app script is wrapped: `tx("key", "Arabic")`, or
  `txp("key", ["Arabic part", "part"], value, ...)` when the text has values in it. The key is a
  hash of the Arabic text with `{0}`, `{1}` … where the values go.
- Fixed page text (buttons, labels, `aria-label`, `placeholder`, the page title) is translated
  when the app starts, by the same key.
- When the language isn't Arabic, the page switches to left-to-right and loads `lang/<code>.js`,
  which sets `window.I18N = {lang, m: {key: translation}}`. A missing translation shows the Arabic
  text, so nothing breaks.
- Numbers use Western digits, read-aloud uses a voice for that language, dates use that language,
  and requests to the helper send `lang`, so «Nabeeh» answers, tells stories and listens in that
  language (see `helper/src/index.js`).
- Monthly content comes from `monthly.<code>.json` (made by the build from `monthly.json`).
- The single-file offline copy of the app can't load packs, so it stays Arabic.

## Files

| File | What it is |
|---|---|
| `i18n/keys.json` | Every translatable Arabic text, by key. Written by `transform.mjs`. |
| `i18n/<code>.json` | The translations: `{key: {"ar": Arabic, "t": translation}}`. Edit this. |
| `lang/<code>.js` | The pack the app loads. Made by `build.py`; don't edit by hand. |
| `monthly.<code>.json` | Monthly content in that language. Made by `build.py`. |
| `i18n/transform.mjs` | Wraps new Arabic texts in `index.html` with `tx()` / `txp()`. Safe to run again. |
| `i18n/build.py` | Syncs the translation files with `keys.json`, checks them, writes the packs. |

## After changing Arabic text in the app

```sh
cd i18n && npm install && cd ..        # once
node i18n/transform.mjs index.html i18n/keys.json
python3 i18n/build.py
```

The build adds new texts to each `i18n/<code>.json` with an empty `"t"`, empties the ones whose
Arabic changed, removes the ones that are gone, and prints how many are left to translate. Fill in
the empty `"t"` values, run the build again, and bump `CACHE` in `sw.js`.

For monthly content, add the item to `monthly.json` and to the copy built into `index.html`
(`MONTHLY_BUILTIN`), then run the two commands above.

## Translation rules

- The helper is «Nabeeh» (never "Claude" or a company or model name). The app is "AI Journey".
- Keep `{0}`, `{1}` … (they may move or be left out) and keep tags like `<b>…</b>`.
- Keep leading or trailing spaces when the Arabic has them (`"and "`): the text is joined to others.
- Drawing ideas are fragments that are joined into a sentence ("a cat", "in orange", "on the moon").
  Every drawing prompt starts with the translation of «ارسم» ("Draw"), and the rainbow colour
  option («بألوان») must be the start of the "rainbow colours" text, because the app checks both.
- The key for `٠١٢٣٤٥٦٧٨٩` is translated as `0123456789`.

## Adding another language to the picker

English (`en`), German (`de`) and French (`fr`) are in the picker. For a new language, run
`python3 i18n/build.py <code>` once to create `i18n/<code>.json` with empty texts, translate
every `t`, build again, then add `['<code>','<name>']` to `LANGS` at the top of
`index.html`, add the language to `LANGS` in `helper/src/index.js` (and rebuild `helper/worker.js`),
and bump `CACHE` in `sw.js`.

German uses "du" for children and "Sie" for parents' texts; French uses "tu" and "vous" the same way.
French texts use a non-breaking space before ? ! : ; % and inside « ».
