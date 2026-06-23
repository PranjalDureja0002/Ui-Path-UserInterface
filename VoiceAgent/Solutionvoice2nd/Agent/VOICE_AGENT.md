# FOREMAN — Voice escalation agent (Twilio, two-way)

Phones the manager and runs the escalation as a **two-way conversation**:
FOREMAN states the case → asks for a decision → the manager answers by **keypad**
(1 = approve, 2 = hold) **or by speaking** ("approve" / "hold") → the decision is
captured and returned. Falls back to a **one-way** announce-and-hang-up if no
webhook is configured. No LLM.

Two parts:
1. **`main.py`** — the UiPath coded agent (entry point `agent`) that places the call.
2. **`voice_server.py`** — a tiny FastAPI webhook that drives the live conversation
   and captures the decision (Twilio fetches TwiML from it during the call).

## Input

| field | required | default | notes |
|-------|----------|---------|-------|
| `to_number` | ✅ | — | E.164, e.g. `+919805022411`. Verified Caller ID on a Twilio trial. |
| `message` | ✅ | — | What FOREMAN says first (the escalation summary). |
| `recommendation` | — | `""` | Spoken **after** the manager approves (the action being authorised). |
| `webhook_url` | — | env/Asset | Public `voice_server` URL → **two-way**. Empty → one-way. |
| `wait_for_decision` | — | `true` | Two-way: block until the manager decides (or `timeout_sec`). |
| `timeout_sec` | — | `75` | How long to wait for the decision. |
| `from_number`, `voice`, `language`, `case_id`, `dry_run` | — | — | as before. |

Output: `placed`, `two_way`, `call_sid`, `status`, **`decision`** (`approved`/`hold`/`no_answer`/`pending`), `to`, `from_`, `error`.

## Credentials & config (never hardcoded — env first, then UiPath Assets in `Shared`)

| purpose | env var | UiPath Asset |
|---------|---------|--------------|
| Account SID | `TWILIO_ACCOUNT_SID` | `Twilio-Account-Sid` |
| Auth Token | `TWILIO_AUTH_TOKEN` | `Twilio-Auth-Token` |
| From number | `TWILIO_FROM_NUMBER` | `Twilio-From-Number` |
| Voice webhook | `VOICE_WEBHOOK_URL` | `Voice-Webhook-Url` |

⚠️ Rotate the auth token shared in chat.

## Run the two-way webhook (host it like the UI tunnel)

```bash
cd Agent
# 1. start the webhook (ephemeral deps via uv — nothing added to the agent package)
uv run --with fastapi --with "uvicorn[standard]" python voice_server.py     # :8090
# 2. expose it publicly
cloudflared tunnel --url http://localhost:8090
# → copy the https://....trycloudflare.com URL it prints
```

Set that URL as `VOICE_WEBHOOK_URL` (local) **and/or** Asset `Voice-Webhook-Url` (cloud).

## Trigger from UiPath (path B)

1. Create 4 Assets in folder **Shared**: `Twilio-Account-Sid`, `Twilio-Auth-Token`,
   `Twilio-From-Number` (`+13203078290`), `Voice-Webhook-Url` (the cloudflared URL).
2. Trial only: add `+91 98050 22411` as a **Verified Caller ID** in the Twilio console.
3. Studio Web (this project auto-syncs) → **Publish** → **Run/Debug** with:

```json
{
  "to_number": "+919805022411",
  "message": "This is FOREMAN about RJ-SOLAR-1, string 12. A melted MC4 connector with an 82 degree hot-spot — a DC arc and fire risk affecting six strings.",
  "recommendation": "Isolate string 12 now and dispatch a matched-brand connector swap."
}
```

The agent calls the phone, the webhook runs the conversation, and the job returns
`decision` (`approved` / `hold`). Add `"dry_run": true` to preview without dialing.

## Local quick test
Set `VOICE_WEBHOOK_URL` in `.env` to the cloudflared URL, then:
```bash
uv run uipath run agent '{"to_number":"+919805022411","message":"…","recommendation":"…"}'
```

Trial accounts prepend a "trial account" notice to the call — expected.
