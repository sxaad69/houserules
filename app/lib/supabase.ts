import { createClient } from '@supabase/supabase-js';

// The publishable key is public-by-design: it ships inside client apps and is
// gated by Row Level Security. The secret key must never live in this repo.
//
// Client setup only — no schema/tables yet. Realtime rooms, presence and
// leaderboards land in realtime/ during the v1 build (roadmap Phase 2).
const SUPABASE_URL = 'https://ajzypbzojvgflajkkwnr.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_1peISP0rKj1Pk-N8VWQ9rQ_g49QMZV7';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
