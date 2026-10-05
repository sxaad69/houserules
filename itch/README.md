# HouseRules — itch.io beta package

## What to upload
- `houserules-web.zip` (3.0 MB) — the full web build. Upload as the game file.

## itch.io project settings (for Saad, when creating the page)
- **Title:** HouseRules — Custom Rule Card Games
- **Kind:** HTML (upload the zip; itch.io unzips and serves `index.html`)
- **Viewport:** 390 × 844 recommended (mobile-first), "Mobile friendly" checked
- **Description draft:**

> HouseRules is a card game platform where the rules are yours. Pick a deck —
> Classic 52, Uno-style 108, Baloot 32, or Animals 12 — choose Shedding or
> Points Race, and play solo vs bots, at always-open house tables, or in
> private rooms with friends (6-letter room codes, no account needed).
>
> Phase 2 adds the Rulebook Builder: design your own rulebook step by step,
> publish it to the community gallery, and rate other players' creations.
>
> Free to play. Gifts and a VIP membership support the game — no betting,
> no loot boxes, winners earn ranks, never coins.

- **Tags:** card-game, multiplayer, board-game, casual
- **Pricing:** Free (donations optional)

## Checklist before publishing the page
- [ ] Play the web build once locally (unzip → serve → click through)
- [ ] Screenshots: use `~/workspace/specs/card-game/qc/*.png`
- [ ] The build phones home to Supabase Realtime for private rooms — fine on itch.io

Built 2026-10-06 from `main` (post Phase-1 streams A/B/C + CrazyGames SDK).
