# BUILD_NOTES.md — HouseRules

**Track:** games portfolio #1 (separate from the 20 utility apps).
**Spec:** `~/workspace/specs/card-game/SPEC.md` · **Roadmap:** `~/workspace/ROADMAP.md`
**Stack:** Expo SDK 57, strict TS, React Navigation 7, Supabase (client only), react-native-iap scaffold.

## Scaffold (2026-10-04)

- Theme: token-based (tokens → light/dark semantic), Android-first, AR/EN with RTL (I18nManager), SafeAreaProvider on all screens.
- Navigation: bottom tabs (Home, Decks, Leaders, Profile) + root stack (Table, PrivateTable).
- Folders ready: `engine/` (deck/rule types), `bots/` (AI opponent identities), `realtime/` (Supabase channels), `economy/` (coin packs, gifts, halal guardrails).
- Billing: VIP monthly sub + 3 coin-pack SKUs scaffolded; **no real products yet** (create in Play Console before any purchase works). Web stub no-ops purchases.
- Supabase: client wired to `ajzypbzojvgflajkkwnr.supabase.co` (publishable key). No schema/tables yet.
- No ads SDK yet (Phase 3 decision).

## Conventions in this app

- `useTheme()` for every color — no hex literals in screens/components.
- `gold` variant on Button/TableCard = VIP surfaces only.
- `ponytail:` comments mark deliberate simplifications with known ceilings.
- Web: `.web.ts` stubs for native-only modules (billing). Metro picks them automatically.

## Do NOT

- Deploy anywhere (no itch.io/CrazyGames/Play until roadmap Phase 3).
- Add tables/schema to Supabase from here without the v1 plan.
- Create real IAP products until pricing decided (spec §16).
