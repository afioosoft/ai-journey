# Adding monthly content

Every month the app can show one new item on the journey map. During its month the item carries a «✨ جديد هذا الشهر» badge. Next month's item shows as a locked «مفاجأة» teaser.

## How to add an item (about 10 minutes)
1. Open `monthly.json` and copy an existing item of the kind you want.
2. Give it a new `id` (for example `2027-02-robots`) and set `month` (`YYYY-MM`).
3. Write every text twice: `s` (small level, about 5 to 7, short and simple) and `b` (big level, about 8 to 12).
4. Commit to `main`. The web app and the store app download the new list the next time they're online. No app update is needed.
5. Also run the app's build step (or ask Claude) to refresh the copy built into `index.html`, so the item also works offline on first launch.
6. For the other languages, run `node i18n/transform.mjs index.html i18n/keys.json` and `python3 i18n/build.py`, translate the new texts in `i18n/<code>.json`, and build again. This writes `monthly.en.json` (and German/French when added). See `i18n/README.md`.

Rules: use only the name «نبيه», never AI company or model names. Keep content kid-safe. Never ask the child for personal information. Everything is shown as plain text, so HTML isn't interpreted.

## Kinds
| kind | Fields | What the child sees |
|---|---|---|
| `mini` | `pages` (each `{ic, s, b}`), `qs`, `home` | A 3 to 5 page mini-lesson with 🔊 read-aloud, then questions, then a home activity |
| `challenge` | `intro`, `qs` | A 5-question themed challenge |
| `story` | `intro`, `chips` (`s`: 2 groups, `b`: 3 groups, each `{l, o:[…]}`) | A story-maker theme with its own choices (needs نبيه) |

Questions: `["question", [["answer", 1], ["wrong answer", 0]], "short explanation"]`. Adaptive difficulty applies: at the easy level only 2 choices are shown.

## Planned items
| Month | Kind | Title |
|---|---|---|
| 2026-11 | mini | كيف يترجم الذكاء الاصطناعي؟ |
| 2026-12 | challenge | تحدّي «من أنا؟»: أدوات ذكية حولنا |
| 2027-01 | story | رحلة إلى الفضاء |
