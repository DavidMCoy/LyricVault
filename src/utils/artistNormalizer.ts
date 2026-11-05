import { Song } from '../types/lyrics';

export interface CanonicalArtistInfo {
  displayName: string;
  sortName: string;
}

/**
 * Curated canonical band names and sort metadata for well-known artists
 * with punctuation or "The" variations.
 */
const CANONICAL_ARTIST_MAP: Record<string, CanonicalArtistInfo> = {
  acdc: { displayName: 'AC/DC', sortName: 'AC/DC' },
  gunsnroses: { displayName: "Guns N' Roses", sortName: "Guns N' Roses" },
  gunsandroses: { displayName: "Guns N' Roses", sortName: "Guns N' Roses" },
  rem: { displayName: 'R.E.M.', sortName: 'R.E.M.' },
  rundmc: { displayName: 'Run-D.M.C.', sortName: 'Run-D.M.C.' },
  zztop: { displayName: 'ZZ Top', sortName: 'ZZ Top' },
  blink182: { displayName: 'blink-182', sortName: 'blink-182' },
  sum41: { displayName: 'Sum 41', sortName: 'Sum 41' },
  u2: { displayName: 'U2', sortName: 'U2' },
  b52s: { displayName: "The B-52's", sortName: "B-52's, The" },
  beatles: { displayName: 'The Beatles', sortName: 'Beatles, The' },
  rollingstones: { displayName: 'The Rolling Stones', sortName: 'Rolling Stones, The' },
  who: { displayName: 'The Who', sortName: 'Who, The' },
  doors: { displayName: 'The Doors', sortName: 'Doors, The' },
  police: { displayName: 'The Police', sortName: 'Police, The' },
  cure: { displayName: 'The Cure', sortName: 'Cure, The' },
  smiths: { displayName: 'The Smiths', sortName: 'Smiths, The' },
  clash: { displayName: 'The Clash', sortName: 'Clash, The' },
  kinks: { displayName: 'The Kinks', sortName: 'Kinks, The' },
  beachboys: { displayName: 'The Beach Boys', sortName: 'Beach Boys, The' },
  byrds: { displayName: 'The Byrds', sortName: 'Byrds, The' },
  animals: { displayName: 'The Animals', sortName: 'Animals, The' },
  temptations: { displayName: 'The Temptations', sortName: 'Temptations, The' },
  supremes: { displayName: 'The Supremes', sortName: 'Supremes, The' },
  fourtops: { displayName: 'The Four Tops', sortName: 'Four Tops, The' },
  jackson5: { displayName: 'The Jackson 5', sortName: 'Jackson 5, The' },
  jacksons: { displayName: 'The Jacksons', sortName: 'Jacksons, The' },
  smashingpumpkins: { displayName: 'The Smashing Pumpkins', sortName: 'Smashing Pumpkins, The' },
  whitestripes: { displayName: 'The White Stripes', sortName: 'White Stripes, The' },
  blackkeys: { displayName: 'The Black Keys', sortName: 'Black Keys, The' },
  killers: { displayName: 'The Killers', sortName: 'Killers, The' },
  strokes: { displayName: 'The Strokes', sortName: 'Strokes, The' },
  verve: { displayName: 'The Verve', sortName: 'Verve, The' },
  cranberries: { displayName: 'The Cranberries', sortName: 'Cranberries, The' },
  offspring: { displayName: 'The Offspring', sortName: 'Offspring, The' },
  weeknd: { displayName: 'The Weeknd', sortName: 'Weeknd, The' },
  allmanbrothersband: { displayName: 'The Allman Brothers Band', sortName: 'Allman Brothers Band, The' },
  jimihendrixexperience: { displayName: 'The Jimi Hendrix Experience', sortName: 'Jimi Hendrix Experience, The' },
  velvetunderground: { displayName: 'The Velvet Underground', sortName: 'Velvet Underground, The' },
  mamasandthepapas: { displayName: 'The Mamas & the Papas', sortName: 'Mamas & the Papas, The' },
  mamasandpapas: { displayName: 'The Mamas & the Papas', sortName: 'Mamas & the Papas, The' },
  doobiebrothers: { displayName: 'The Doobie Brothers', sortName: 'Doobie Brothers, The' },
  cars: { displayName: 'The Cars', sortName: 'Cars, The' },
  pretenders: { displayName: 'The Pretenders', sortName: 'Pretenders, The' },
  talkingheads: { displayName: 'Talking Heads', sortName: 'Talking Heads' },
  eagles: { displayName: 'Eagles', sortName: 'Eagles' },
  pixies: { displayName: 'Pixies', sortName: 'Pixies' },
  ramones: { displayName: 'Ramones', sortName: 'Ramones' },
  scorps: { displayName: 'Scorpions', sortName: 'Scorpions' },
  scorpions: { displayName: 'Scorpions', sortName: 'Scorpions' },
  simonandgarfunkel: { displayName: 'Simon & Garfunkel', sortName: 'Simon & Garfunkel' },
  hallandoates: { displayName: 'Hall & Oates', sortName: 'Hall & Oates' },
  earthwindandfire: { displayName: 'Earth, Wind & Fire', sortName: 'Earth, Wind & Fire' },
  crosbystillsnashandyoung: { displayName: 'Crosby, Stills, Nash & Young', sortName: 'Crosby, Stills, Nash & Young' },
  crosbystillsandnash: { displayName: 'Crosby, Stills & Nash', sortName: 'Crosby, Stills & Nash' },
  creedenceclearwaterrevival: { displayName: 'Creedence Clearwater Revival', sortName: 'Creedence Clearwater Revival' },
  ccr: { displayName: 'Creedence Clearwater Revival', sortName: 'Creedence Clearwater Revival' },
};

/**
 * Computes a normalized alphanumeric fingerprint for an artist name so that:
 * - "AC DC", "Ac-Dc", "AC-DC", "AC/DC" -> "acdc"
 * - "The Beatles", "Beatles", "Beatles, The" -> "beatles"
 * - "Guns N' Roses", "Guns N Roses", "Guns 'N' Roses" -> "gunsnroses"
 */
export function getArtistFingerprint(rawArtist: string): string {
  if (!rawArtist) return 'unknownartist';

  let s = rawArtist
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  // Convert trailing ", the" (e.g. "Beatles, The") to leading "the "
  s = s.replace(/,\s*the$/, '');

  // Strip leading "the " unless the band is literally "The The"
  if (s !== 'the the' && s.startsWith('the ')) {
    s = s.slice(4).trim();
  }

  // Normalize ampersands / pluses when surrounded by spaces
  s = s.replace(/\s*[&+]\s*/g, 'and');

  // Remove all non-alphanumeric characters (spaces, slashes, hyphens, dots, apostrophes)
  s = s.replace(/[^a-z0-9]/g, '');

  return s || 'unknownartist';
}

/**
 * Computes a normalized fingerprint for a song title to prevent duplicate songs
 * (strips "(Remastered 2011)", "- 2015 Remaster", punctuation, case, etc.)
 */
export function getTrackFingerprint(rawTrack: string): string {
  if (!rawTrack) return 'unknowntrack';

  let s = rawTrack
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  // Remove common remaster/edition suffixes in parentheses or after hyphen
  s = s.replace(/\s*\([^)]*(remaster|version|edit|mix|mono|stereo|deluxe|anniversary)[^)]*\)/gi, '');
  s = s.replace(/\s*-\s*([0-9]{4}\s*)?(remaster|remastered|version|edit|mono|stereo|single|album).*$/gi, '');

  // Normalize ampersands
  s = s.replace(/\s*[&+]\s*/g, 'and');

  // Strip leading "the " for comparison only if longer title
  s = s.replace(/[^a-z0-9]/g, '');

  return s || 'unknowntrack';
}

/**
 * Generates dedicated sort metadata for an artist name:
 * - "The Beatles" -> "Beatles, The"
 * - "The Rolling Stones" -> "Rolling Stones, The"
 * - "AC DC" / "Ac-Dc" -> "AC/DC"
 */
export function computeArtistSortName(artistName: string, existingSortName?: string): string {
  const fp = getArtistFingerprint(artistName);
  if (CANONICAL_ARTIST_MAP[fp]) {
    return CANONICAL_ARTIST_MAP[fp].sortName;
  }

  if (existingSortName && existingSortName.trim().length > 0) {
    const trimmed = existingSortName.trim();
    // If existing sort name still starts with "The ", convert it to ", The"
    if (/^the\s+/i.test(trimmed) && trimmed.toLowerCase() !== 'the the') {
      return `${trimmed.replace(/^the\s+/i, '').trim()}, The`;
    }
    return trimmed;
  }

  const clean = canonicalizeArtistDisplayName(artistName);
  if (clean.toLowerCase() === 'the the') return 'The The';

  if (/^the\s+/i.test(clean)) {
    const body = clean.replace(/^the\s+/i, '').trim();
    return `${body}, The`;
  }

  return clean;
}

/**
 * Generates dedicated sort metadata for a track title:
 * - "The Sound of Silence" -> "Sound of Silence, The"
 */
export function computeTrackSortName(trackName: string, existingSortName?: string): string {
  if (existingSortName && existingSortName.trim().length > 0) {
    return existingSortName.trim();
  }
  const clean = (trackName || '').trim();
  if (/^the\s+/i.test(clean) && clean.length > 4) {
    const body = clean.replace(/^the\s+/i, '').trim();
    return `${body}, The`;
  }
  return clean;
}

/**
 * Converts messy artist names ("AC DC", "Ac-Dc", "AC-DC", "Beatles, The") into
 * their canonical display name ("AC/DC", "The Beatles").
 */
export function canonicalizeArtistDisplayName(rawArtist: string): string {
  const trimmed = (rawArtist || '').trim().replace(/\s+/g, ' ');
  if (!trimmed) return 'Unknown Artist';

  const fp = getArtistFingerprint(trimmed);
  if (CANONICAL_ARTIST_MAP[fp]) {
    return CANONICAL_ARTIST_MAP[fp].displayName;
  }

  // Convert "Beatles, The" -> "The Beatles" for display
  if (/,\s*the$/i.test(trimmed)) {
    const base = trimmed.replace(/,\s*the$/i, '').trim();
    return `The ${base}`;
  }

  // If all lowercase or all uppercase (and > 4 chars), title-case words smartly
  if (trimmed === trimmed.toLowerCase() || (trimmed === trimmed.toUpperCase() && trimmed.length > 4 && !trimmed.includes('/'))) {
    return trimmed
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  return trimmed;
}

/**
 * Normalizes a Song object in-place with canonical artist display name
 * and dedicated sort metadata tags (`artistSortName` and `trackSortName`).
 */
export function normalizeSongMetadata(song: Song): Song {
  const canonicalArtist = canonicalizeArtistDisplayName(song.artistName);
  const artistSortName = computeArtistSortName(canonicalArtist, song.artistSortName);
  const trackSortName = computeTrackSortName(song.trackName, song.trackSortName);

  return {
    ...song,
    artistName: canonicalArtist,
    artistSortName,
    trackSortName,
  };
}

/**
 * Returns the first alphabetical bucket ('A'-'Z' or '#') using the dedicated sort tag!
 * For example, "The Beatles" uses `artistSortName` ("Beatles, The") -> 'B'.
 */
export function getSortBucketLetter(sortNameOrDisplay: string): string {
  const ch = (sortNameOrDisplay || '').trim().charAt(0).toUpperCase();
  if (ch >= 'A' && ch <= 'Z') return ch;
  return '#';
}
