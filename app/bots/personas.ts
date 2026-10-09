// bots/personas.ts — bot identities. Names with personality: the table should
// feel alive, not like playing a spreadsheet. Difficulty skews easy/medium so
// new players win sometimes (retention), hard bots are the rare sharks.

import type { BotDifficulty } from './index';

export interface BotPersona {
  name: string;
  tagline: string;
  difficulty: BotDifficulty;
  /** Emoji avatar shown on the seat instead of an initial. */
  avatar: string;
  /** Fun alternative gamer-tag aliases. Family-friendly, English (universal gamer tags). */
  aliases: string[];
}

export const BOT_PERSONAS: BotPersona[] = [
  { name: 'Falcon', tagline: 'Strikes fast, never bluffs.', difficulty: 'hard', avatar: '🦅', aliases: ['SkyHunter', 'DiveBomber', 'Talons'] },
  { name: 'Sahara', tagline: 'Patient as the desert.', difficulty: 'medium', avatar: '🏜️', aliases: ['DustDevil', 'SunChaser', 'GoldenHour'] },
  { name: 'Mirage', tagline: 'You saw what you wanted to see.', difficulty: 'medium', avatar: '🌫️', aliases: ['HeatHaze', 'TrickLight', 'Vanisher'] },
  { name: 'Dune', tagline: 'Shifts when you least expect it.', difficulty: 'easy', avatar: '⛰️', aliases: ['SandSurfer', 'RidgeRunner', 'SoftLanding'] },
  { name: 'Oasis', tagline: 'Everyone’s favorite stop.', difficulty: 'easy', avatar: '🌴', aliases: ['PalmShade', 'CoolDrink', 'RestStop'] },
  { name: 'Zephyr', tagline: 'Gone before you notice.', difficulty: 'medium', avatar: '💨', aliases: ['Breezy', 'Gusty', 'Tailwind'] },
  { name: 'Ember', tagline: 'Plays with fire.', difficulty: 'medium', avatar: '🔥', aliases: ['SparkFly', 'Kindling', 'WarmUp'] },
  { name: 'Nomad', tagline: 'No table is home.', difficulty: 'easy', avatar: '🧭', aliases: ['Wanderer', 'Drifter', 'Wayfinder'] },
  { name: 'Sirocco', tagline: 'A hot wind of bad decisions — yours.', difficulty: 'hard', avatar: '🌪️', aliases: ['HotHead', 'DesertStorm', 'BlowHard'] },
  { name: 'Caravan', tagline: 'Brings the whole crew.', difficulty: 'easy', avatar: '🐪', aliases: ['HumpDay', 'SlowPoke', 'LongHaul'] },
  { name: 'Anubis', tagline: 'Weighs your heart against a feather.', difficulty: 'hard', avatar: '🐺', aliases: ['Jackal', 'SoulWeigher', 'NightJudge'] },
  { name: 'Simba', tagline: 'Still learning the savanna.', difficulty: 'easy', avatar: '🦁', aliases: ['CubClub', 'RoarNewb', 'PrideLing'] },
];

/** Deterministic persona for a seat — stable across reconnects. */
export function personaForSeat(seat: number): BotPersona {
  return BOT_PERSONAS[seat % BOT_PERSONAS.length];
}

/** Look up a persona's avatar by bot name (base name or alias). Falls back to 🎴. */
export function avatarForName(name: string): string {
  const persona = BOT_PERSONAS.find((p) => p.name === name || p.aliases.includes(name));
  return persona?.avatar ?? '🎴';
}

/** Find the persona behind a base name or alias. */
export function personaForName(name: string): BotPersona | undefined {
  return BOT_PERSONAS.find((p) => p.name === name || p.aliases.includes(name));
}

/**
 * Fun display name for a bot seat: the persona's base name or a random alias.
 * Pass a seeded rng for deterministic tables (stable across reconnects).
 */
export function randomBotName(persona: BotPersona, rng: () => number = Math.random): string {
  const pool = [persona.name, ...persona.aliases];
  return pool[Math.floor(rng() * pool.length)];
}
