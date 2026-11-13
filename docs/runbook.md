# WordBook — Runbook

**Prototype link:** https://github.com/kenvifire/WordBook_Prototype
**Business & Tech Note:** `docs/business-tech-note.md` in this repo

## Use

WordBook teaches a learner the vocabulary of the next section of a book they chose, before they read it — not a generic flashcard deck. The learner studies an AI-picked, AI-defined set of words for the upcoming section, passes a recognition gate, then reads the unlocked section, tapping any other unfamiliar word for an instant translation that's added to their review queue.

**To run it:**
```bash
npm install
cp .env.local.example .env.local   # fill in OPENAI_API_KEY at minimum
npm run seed:demo                  # pre-masters section 1 and warms the AI cache for section 2
npm run dev                        # open http://localhost:3000
```

## Business goal

Get learners reading more of the real books they chose, and retaining more of the vocabulary from doing so — replacing the broken choice between "stop and look up every word" and "skip it and lose the plot." Full detail: Business & Tech Note, Section 1.

## Limits

- **One language pair** (Spanish → English) and **one bundled book** (*Platero y yo*, public domain) for this MVP — not a general book-upload product yet.
- **Plain text only.** No PDF support; unusual formatting (footnotes, verse) is not specifically handled.
- **Single local learner.** No accounts, no multi-user isolation; state is local JSON files, not a real database — fine for a pilot, not for scale.
- **No pilot data yet.** The "Customer Insight" evidence in the Tech Note is a testing plan, not results — the pilot runs before the 1 December submission.
- Tapping a word while reading adds it to the review queue but isn't shown again anywhere in the UI yet, and can affect a section's recognition rate if revisited after already passing it (known, accepted limitation).

## Costs

- **OpenAI (`gpt-4o-mini`):** a fraction of a cent per section studied (one prioritization call + up to 12 per-word definition calls, cached per section — repeat study of a section costs nothing further).
- **MyMemory translation (tap-to-add):** free tier, rate-limited (~thousands of words/day anonymously); fine for a pilot.
- **Hosting:** none required for the live demo (`npm run dev`, local); a hosted link is a stretch goal, free-tier deployable (e.g. Vercel).

## Known risks

- A live OpenAI or MyMemory failure mid-demo — **mitigated**, see Fallback below.
- The 80% recognition threshold might feel like a wall rather than momentum — tunable, but real tuning needs pilot evidence (not yet collected).
- No GDPR exposure today (no accounts, no PII collected) — but a multi-user version would need a real consent/retention policy before launch.
- The demo book is public domain; supporting learner-chosen copyrighted books at scale would need a licensing or architecture change (vocabulary extraction only, not full text storage).

## Fallback

- **If a live AI call fails during the demo:** the app already degrades gracefully — word prioritization falls back to a frequency-ranked list, definitions fall back to a clearly labeled "(definition unavailable)," and translation echoes the original word. Nothing crashes; the flow keeps working, just with less personalization.
- **Before presenting:** run `npm run seed:demo` with a real `OPENAI_API_KEY` set ahead of time so the live-demo section's AI content is pre-cached — the on-stage walkthrough then doesn't depend on a live call succeeding in front of judges.
- **If you rehearse beforehand:** re-run `npm run seed:demo` afterward — it resets the learner's progress (keeping the warmed AI cache) so the live section starts fresh, not already-unlocked from the rehearsal.
- **If the whole app won't boot on the day:** fall back to walking through this runbook and the Business & Tech Note on screen, and the recorded/rehearsed flow, rather than debugging live.
