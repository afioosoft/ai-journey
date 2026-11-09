# Helper server for "اسأل نبيه"

This small Cloudflare Worker lets the kids ask Claude questions inside the lessons.
It keeps the Anthropic API key secret, checks the family PIN, sends off-topic
questions back with a friendly fixed reply, blocks phone numbers and e-mail
addresses, and asks Claude for a short, child-safe answer in Arabic.
It also makes pictures with OpenAI's image generator (GPT Image 2.5): medium
quality for each child's 10 detailed pictures a week, low quality for simple
drawings, story covers and any extra pictures. Stories are written turn by turn
with Claude Haiku, after checking that each idea suits young children.
It stores nothing.

**Updating:** when this file changes, open the Worker in Cloudflare → Edit code,
replace everything with the new `worker.js`, and click Deploy. Your secrets stay.

- `src/index.js` is the readable source.
- `worker.js` is the same code bundled into one file (with the Anthropic SDK) to paste into Cloudflare.

## Set it up (about 15 minutes)

### 1. Anthropic API key
1. Go to https://console.anthropic.com and sign in or sign up.
2. **Billing**: add a small credit, for example $5.
3. **Limits**: set a monthly spend limit, for example $10.
4. **API keys**: create a key and copy it. You only see it once.

### 2. Cloudflare Worker (free)
1. Sign up at https://dash.cloudflare.com.
2. **Workers & Pages** → **Create** → **Start with Hello World** → name it `ai-journey-helper` → **Deploy**.
3. **Edit code**, delete everything, then paste the whole of
   https://raw.githubusercontent.com/afioosoft/ai-journey/main/helper/worker.js
   (open it, Ctrl+A, Ctrl+C) and click **Deploy**.
4. **Settings → Variables and Secrets** → add two **Secret** values:
   - `ANTHROPIC_API_KEY` = the key from step 1
   - `FAMILY_PIN` = a PIN you choose, e.g. 6 digits
   Optional text values: `ANSWER_MODEL` for chat answers and `STORY_MODEL` for stories
   (both default `claude-haiku-5-5`, the cheapest; `claude-sonnet-5-5` costs about 20 times more).
   **If you set `ANSWER_MODEL` to Sonnet earlier, delete that variable** so chat uses Haiku.
5. Copy the Worker address, like `https://ai-journey-helper.<name>.workers.dev`.

### 3. In the app on each device
ركن الأهل → اسأل نبيه → switch it on, paste the address, type the PIN,
choose the daily limit, and press «جرّب الاتصال».

## Real pictures in the drawing studio (optional, about 5 minutes)

The drawing studio has two artists: «رسم نبيه» (a simple cartoon drawing, low
quality) and «مولّد الصور» (a detailed, real-looking picture, medium quality for
the first 10 each week per child, then low). Story covers are low quality too.
Every idea first passes the same Claude kid-safety check, then OpenAI's own
safety filter. Without an OpenAI key, «رسم نبيه» and covers fall back to simple
shapes drawn by Claude.

1. Go to https://platform.openai.com and sign in or sign up.
2. **Settings → Billing**: add a small credit, for example $5.
3. **Settings → Limits**: set a monthly budget, for example $5.
4. **API keys → Create new secret key**, copy it. You only see it once.
   (OpenAI may ask you to verify your organization before image models work.)
5. In Cloudflare: your Worker → **Settings → Variables and Secrets** → add a
   **Secret** `OPENAI_API_KEY` = the key. Deploy.
6. In the app: ركن الأهل → اسأل نبيه → «جرّب الاتصال» should now say
   «الصور الحقيقية مفعّلة».

Optional text values:
- `IMAGE_MODEL` (default `gpt-image-2.5-flare`, GPT Image 2.5). If OpenAI says
  the model is unknown, the helper retries once with `gpt-image-2`, so pictures
  keep working.
- `IMAGE_QUALITY` for the weekly detailed pictures: `medium` (default, about
  US$0.013 a picture), `low` (about US$0.006) or `high` (about US$0.053).
- `DRAW_QUALITY` for simple drawings, covers and extra pictures: `low` (default).

Each picture counts as one use of the child's daily limit. The app counts
every AI use per child per week (ركن الأهل → اسأل نبيه → «استعمال نبيه هذا الأسبوع»).

The same OpenAI key also powers the 🎤 microphone in the drawing studio: the
child says what they want, the voice is turned into Arabic words
(`gpt-4o-mini-transcribe`, a fraction of a cent per use; change with
`LISTEN_MODEL`), and the words appear in the description box. The recording is
sent once and not stored. The browser asks for microphone permission the
first time.

## Automatic updates (no more copy and paste)

When a change to `helper/worker.js` is merged into `main`, GitHub deploys it to the Cloudflare Worker
`ai-journey-helper` by itself (`.github/workflows/deploy-helper.yml`). Merging the pull request is the approval.
You can also run it by hand: GitHub → Actions → "Deploy helper to Cloudflare" → Run workflow.

It needs two repository secrets (GitHub → Settings → Secrets and variables → Actions):
- `CLOUDFLARE_API_TOKEN`: a Cloudflare API token with **Workers Scripts: Edit** (the "Edit Cloudflare Workers" template)
- `CLOUDFLARE_ACCOUNT_ID`: your Cloudflare account ID

Secrets stored in Cloudflare (API keys, `FAMILY_PIN`) are never changed by a deploy, and settings added in the
dashboard are kept (`keep_vars = true` in `helper/wrangler.toml`).
