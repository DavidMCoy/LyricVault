import { describe, it, expect } from 'vitest';
import {
  getArtistFingerprint,
  canonicalizeArtistDisplayName,
  computeArtistSortName,
  computeTrackSortName,
  getSortBucketLetter,
  normalizeSongMetadata,
} from './artistNormalizer';
import { Song } from '../types/lyrics';

describe('artistNormalizer & Dedicated Sort Metadata Tags', () => {
  it('merges AC DC, Ac-Dc, AC-DC, and AC/DC into identical fingerprint and canonical name', () => {
    const variations = ['AC DC', 'Ac-Dc', 'AC-DC', 'AC/DC', 'ac/dc', 'AC / DC'];
    for (const v of variations) {
      expect(getArtistFingerprint(v)).toBe('acdc');
      expect(canonicalizeArtistDisplayName(v)).toBe('AC/DC');
      expect(computeArtistSortName(v)).toBe('AC/DC');
    }
  });

  it('generates dedicated sort metadata tags for bands starting with "The"', () => {
    expect(getArtistFingerprint('The Beatles')).toBe('beatles');
    expect(getArtistFingerprint('Beatles')).toBe('beatles');
    expect(canonicalizeArtistDisplayName('Beatles')).toBe('The Beatles');
    expect(computeArtistSortName('The Beatles')).toBe('Beatles, The');
    expect(getSortBucketLetter(computeArtistSortName('The Beatles'))).toBe('B');

    expect(computeArtistSortName('The Rolling Stones')).toBe('Rolling Stones, The');
    expect(getSortBucketLetter(computeArtistSortName('The Rolling Stones'))).toBe('R');

    expect(computeArtistSortName('The Who')).toBe('Who, The');
    expect(getSortBucketLetter(computeArtistSortName('The Who'))).toBe('W');

    expect(computeArtistSortName('The Unknown Band')).toBe('Unknown Band, The');
    expect(getSortBucketLetter(computeArtistSortName('The Unknown Band'))).toBe('U');
  });

  it('preserves "The The" as a special edge-case band name under T', () => {
    expect(computeArtistSortName('The The')).toBe('The The');
    expect(getSortBucketLetter(computeArtistSortName('The The'))).toBe('T');
  });

  it('generates dedicated trackSortName for song titles starting with "The"', () => {
    expect(computeTrackSortName('The Sound of Silence')).toBe('Sound of Silence, The');
    expect(computeTrackSortName('Hotel California')).toBe('Hotel California');
  });

  it('populates artistSortName and trackSortName on Song objects', () => {
    const rawSong: Song = {
      id: 'test-1',
      trackName: 'The Long and Winding Road',
      artistName: 'the beatles',
      instrumental: false,
      source: 'custom',
      addedAt: 1000,
      updatedAt: 1000,
      isFavorite: false,
    };

    const normalized = normalizeSongMetadata(rawSong);
    expect(normalized.artistName).toBe('The Beatles');
    expect(normalized.artistSortName).toBe('Beatles, The');
    expect(normalized.trackSortName).toBe('Long and Winding Road, The');
  });
});
