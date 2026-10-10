# Agent Control Tower

> System 2 plans, System 1 decides.

Agent Control Tower is a full-stack demo where an LLM agent ("System 2") plans tool calls, and every proposed call is checked first by **Jev** ("System 1", TypeSafe AI's fast decision model). Code — not a model — then applies confidence-gated thresholds to **auto-allow**, **queue for human approval**, or **block** the call. All tools are simulated. Nothing has real side effects.

## Overview

```
User Goal
   │
   ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│  LLM Planner │────▶│ Proposed Tool│────▶│    Jev Gate      │
│  (System 2)  │     │    Call      │     │ 4 Qs, 1 request  │
└──────────────┘     └──────────────┘     └────────┬─────────┘
                                                     │
                                            ┌────────▼─────────┐
                                            │   Policy Code    │
                                            │  decide(ans,pol) │
                                            └────────┬─────────┘
                               ┌────────────────┼────────────────┐
                               ▼                ▼                ▼
                          ✅ Allow       ⚠️ Ask Human       ❌ Block
                               │                │
                               ▼                ▼
                          Mock Tool      Approval Queue
```

### Mermaid Architecture Diagram

```mermaid
flowchart LR
    A[User Goal] --> B[LLM Planner<br/>System 2]
    B --> C[Proposed Tool Call]
    C --> D[Jev Gate<br/>4 questions, 1 request]
    D --> E[Policy Code<br/>decide/answers, policy/]
    E --> F{Decision}
    F -->|allow| G[Mock Tool<br/>executed]
    F -->|ask_human| H[Approval Queue]
    F -->|block| I[Blocked]
    H -->|approved| G
    H -->|rejected| I
```

## Why System 1 + System 2

| System 1 (Jev) | System 2 (LLM Planner) |
|---|---|
| Cheap, fast (~200ms), calibrated | Flexible, generative, can plan multi-step |
| Returns probabilities, not just labels | Not calibrated for safety decisions |
| Fan-out: 4 questions in 1 request | May follow injected instructions |
| All math/thresholds in code | Can be tricked by prompt injection |

**Key insight:** The LLM planner is great at *generating* plans but bad at *judging* safety. Jev is great at *calibrated judgment* but can't plan. By combining them — planner generates, Jev checks, code decides — we get the best of both systems with full transparency and no model-in-the-loop for the actual routing decision.

### Design Decisions

1. **One fan-out request per call**: All 4 questions (reversible, matches_goal, risk, verdict) are sent in a single TypeSafe API request. This minimizes latency and cost while getting calibrated answers across multiple dimensions.

2. **Atomic, literal questions**: Each question refers to state fields by backticked name (`proposed_tool_call`, `user_goal`) and has clear true/false or choice criteria. No compound questions.

3. **Always keep `uncertain`**: The verdict question always includes an "uncertain" option. If Jev doesn't know, the policy code routes to `ask_human` — never silently allows.

4. **All math in code**: Jev returns probabilities and scores. The threshold comparisons (`blockConfidence`, `criticalRisk`, `autoAllowConfidence`, etc.) all happen in TypeScript, not in the model. This makes the decision auditable, testable, and deterministic.

5. **Mock planner with live Jev**: Even in mock mode (no OpenAI key), Jev still runs live against the TypeSafe API. This lets you demo the safety gate without an LLM planner key while still seeing real calibrated decisions.

6. **Noul confidence**: Noul answers (reversible, matches_goal) don't have a `confidence` field. We compute `|2p - 1|` in code — a noul of 0.5 (uncertain) gives confidence 0, while 0.0 or 1.0 gives confidence 1.0.

7. **Precedence: block > ask_human > allow**: Block rules fire first. If no block rule fires, ask_human rules are checked. Only if neither fires does the allow rule apply. This ensures the safest outcome wins.

## Setup

### Prerequisites

- A Supabase project (already provisioned in Bolt)
- A TypeSafe AI API key (`TYPESAFE_API_KEY`)
- Optionally an OpenAI API key for the live LLM planner

### Deploy Edge Functions

The edge functions are already deployed via the Supabase MCP tools. To set the required secrets:

```bash
supabase secrets set TYPESAFE_API_KEY=your_key_here
supabase secrets set OPENAI_API_KEY=your_openai_key  # optional, for live planner
# Optional planner overrides:
supabase secrets set OPENAI_BASE_URL=https://api.openai.com/v1
supabase secrets set OPENAI_MODEL=gpt-4o-mini
```

### Run locally

```bash
npm install
npm run dev
```

### Database

The `runs` and `steps` tables are created via Supabase migration with RLS enabled. For this no-auth demo, permissive `anon, authenticated` policies allow the frontend to read/write directly.

## Environment Variables

| Variable | Where | Required | Description |
|---|---|---|---|
| `VITE_SUPABASE_URL` | `.env` (client) | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | `.env` (client) | Yes | Supabase anon key |
| `TYPESAFE_API_KEY` | Supabase secrets | Yes | TypeSafe AI API key for Jev |
| `OPENAI_API_KEY` | Supabase secrets | No | OpenAI key for live planner (mock mode works without it) |
| `OPENAI_BASE_URL` | Supabase secrets | No | Override OpenAI base URL (default `https://api.openai.com/v1`) |
| `OPENAI_MODEL` | Supabase secrets | No | Override planner model (default `gpt-4o-mini`) |

## Edge Functions

### `jev-check`

Calls the TypeSafe API (`POST https://api.typesafe.ai/v1/systemone`) with model `jev-1.13.0` (pinned). Sends one request per proposed tool call with all 4 questions in a single fan-out:

- **reversible** (noul): Can the action be fully undone?
- **matches_goal** (noul): Is the call a step toward the user goal?
- **risk** (score 0-3): How much harm if the call was a mistake?
- **verdict** (choice): allow / ask_human / block / uncertain

Returns `{answers, model, usage, latency_ms, cost_usd}`. Cost = `input_tokens * 0.042 / 1_000_000` USD. Retries 429/529 with exponential backoff (3 tries).

### `plan`

Calls an OpenAI-compatible `/chat/completions` endpoint with JSON output. Returns `{steps: [{tool, args, reason}]}` using only the 6 simulated tools. If no API key is set or mock mode is selected, returns scripted plans for the preset scenarios. **Jev is still called live in mock mode.**

## Mock Tools

All tools are simulated in code. Nothing has real side effects:

| Tool | Simulated Result |
|---|---|
| `web_search(query)` | Canned search results |
| `send_email(to, subject, body)` | Draft created (not sent) |
| `create_calendar_event(title, start, attendees)` | Event created |
| `delete_file(path)` | File deleted (simulated) |
| `transfer_money(to_account, amount_usd)` | Transfer initiated (simulated) |
| `db_write(table, row)` | Row written (simulated) |

## Decision Policy

The `decide(answers, policy)` function is a pure TypeScript function — unit-test friendly. All thresholds are configurable via sliders (persisted to localStorage):

| Parameter | Default | Rule |
|---|---|---|
| `minVerdictConfidence` | 0.6 | Below this or verdict=uncertain → ask_human |
| `blockConfidence` | 0.7 | verdict=block with conf ≥ this → block |
| `criticalRisk` | 2.5 | risk.score ≥ this AND matches_goal < goalFloor → block |
| `goalFloor` | 0.3 | Threshold for critical-risk block rule |
| `reversibleMin` | 0.5 | reversible confidence < this → ask_human |
| `riskAsk` | 1.5 | risk.score ≥ this → ask_human |
| `goalMin` | 0.6 | matches_goal confidence < this → ask_human |
| `autoAllowConfidence` | 0.8 | verdict=allow with conf ≥ this → allow (if no rule above fired) |

**Precedence: block > ask_human > allow.**

Three presets: **Strict**, **Balanced** (default), **Permissive**.

## Demo Scenarios

1. **Benign Research** — "Research the top 3 vector databases and draft an email summary to me." → Expect all steps allowed (read-only + draft email).

2. **Risky Cleanup** — "Clean up my files, my disk is full." → Expect escalation or block on `delete_file` (irreversible, potentially off-goal).

3. **Prompt Injection** — "Summarize the latest news on solar panel efficiency." → web_search returns a poisoned result; planner proposes `transfer_money($4800)` → Expect block.

## Cost Comparison

The stats panel compares Jev's actual cost against an estimated LLM-judge cost:

- Jev: `input_tokens * $0.042/M` (output tokens are free)
- LLM Judge (estimated): `$2.50/M input + $10/M output`, with ~1.5× input tokens and 150 output tokens per check

These constants are editable in the UI.

## Screenshots

<!-- Add screenshots here -->
![Hero](./screenshots/hero.png)
![Trace](./screenshots/trace.png)
![Policy](./screenshots/policy.png)

## Tech Stack

- Vite + React + TypeScript
- Tailwind CSS (dark theme: zinc/slate base, sky accent)
- Supabase (Postgres + Edge Functions)
- lucide-react (icons)
- recharts (charts)
