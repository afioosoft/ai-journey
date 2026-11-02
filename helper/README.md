# Helper server for "اسأل نبيه"

This small Cloudflare Worker lets the kids ask Claude questions inside the lessons.
It keeps the Anthropic API key secret, checks the family PIN, sends off-topic
questions back with a friendly fixed reply, blocks phone numbers and e-mail
addresses, and asks Claude for a short, child-safe answer in Arabic.
It also draws simple pictures (SVG) for the drawing studio and writes stories
turn by turn with the child, after checking that each idea suits young children.
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
   Optional text values: `ANSWER_MODEL` (default `claude-sonnet-5-5`; `claude-haiku-5-5` costs less, `claude-opus-5-5` costs more).
5. Copy the Worker address, like `https://ai-journey-helper.<name>.workers.dev`.

### 3. In the app on each device
ركن الأهل → اسأل نبيه → switch it on, paste the address, type the PIN,
choose the daily limit, and press «جرّب الاتصال».
