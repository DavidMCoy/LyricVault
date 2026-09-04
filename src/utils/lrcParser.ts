import { SyncedLine } from '../types/lyrics';

export interface ParsedLRC {
  metadata: Record<string, string>;
  lines: SyncedLine[];
  plainText: string;
  hasSync: boolean;
}

/**
 * Parses timecode string [mm:ss.xx] or [mm:ss:xx] or [mm:ss] into seconds (float)
 */
export function parseTimeStamp(timeStr: string): number | null {
  const match = timeStr.match(/\[?(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]?/);
  if (!match) return null;

  const minutes = parseInt(match[1], 10);
  const seconds = parseInt(match[2], 10);
  let fraction = 0;

  if (match[3]) {
    const fractionStr = match[3];
    if (fractionStr.length === 1) {
      fraction = parseInt(fractionStr, 10) / 10;
    } else if (fractionStr.length === 2) {
      fraction = parseInt(fractionStr, 10) / 100;
    } else {
      fraction = parseInt(fractionStr, 10) / 1000;
    }
  }

  return minutes * 60 + seconds + fraction;
}

/**
 * Formats seconds into mm:ss.xx format for LRC tags
 */
export function formatLrcTimestamp(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round(((seconds % 1) + Number.EPSILON) * 100) % 100;
  return `[${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(2, '0')}]`;
}

/**
 * Formats seconds into mm:ss for UI display
 */
export function formatTimeDisplay(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Parses an entire LRC or XLRC file string
 */
export function parseLRC(lrcText: string): ParsedLRC {
  const metadata: Record<string, string> = {};
  const rawLines = lrcText.split(/\r?\n/);
  const parsedEntries: { time: number; text: string; translation?: string }[] = [];
  const plainTextLines: string[] = [];

  const timeTagRegex = /\[(\d{1,2}:\d{2}(?:[.:]\d{1,3})?)\]/g;
  const metaTagRegex = /^\[([a-zA-Z]+):([^\]]*)\]$/;

  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      plainTextLines.push('');
      continue;
    }

    // Check for metadata tag e.g. [ti:Song Title] or [ar:Artist]
    const metaMatch = trimmed.match(metaTagRegex);
    if (metaMatch) {
      metadata[metaMatch[1].toLowerCase()] = metaMatch[2].trim();
      continue;
    }

    // Extract all timestamp tags in the line (handles multi-timestamp lines like [00:12.34][01:23.45]Hello)
    const matches = Array.from(trimmed.matchAll(timeTagRegex));
    if (matches.length > 0) {
      // Remove all time tags to get text content
      const cleanText = trimmed.replace(timeTagRegex, '').trim();

      // Check for XLRC format translation separator (e.g. "Japanese text | English translation" or "Line / Translation")
      let mainText = cleanText;
      let translation: string | undefined;
      if (cleanText.includes(' | ')) {
        const parts = cleanText.split(' | ');
        mainText = parts[0];
        translation = parts.slice(1).join(' | ');
      }

      plainTextLines.push(mainText);

      for (const match of matches) {
        const timeSec = parseTimeStamp(match[1]);
        if (timeSec !== null) {
          parsedEntries.push({
            time: timeSec,
            text: mainText,
            translation,
          });
        }
      }
    } else {
      // Plain line without timestamp
      plainTextLines.push(trimmed);
    }
  }

  // Sort by time ascending
  parsedEntries.sort((a, b) => a.time - b.time);

  // Apply offset metadata if present
  if (metadata['offset']) {
    const offsetMs = parseFloat(metadata['offset']);
    if (!isNaN(offsetMs)) {
      const offsetSec = offsetMs / 1000;
      parsedEntries.forEach(line => {
        line.time = Math.max(0, line.time + offsetSec);
      });
    }
  }

  return {
    metadata,
    lines: parsedEntries,
    plainText: plainTextLines.join('\n'),
    hasSync: parsedEntries.length > 0,
  };
}

/**
 * Finds the index of the currently active line for a given time
 */
export function getActiveLineIndex(lines: SyncedLine[], currentTime: number, offsetMs: number = 0): number {
  if (!lines || lines.length === 0) return -1;

  const adjustedTime = currentTime - (offsetMs / 1000);
  if (adjustedTime < lines[0].time) return -1;

  for (let i = lines.length - 1; i >= 0; i--) {
    if (adjustedTime >= lines[i].time) {
      return i;
    }
  }

  return 0;
}

/**
 * Converts an array of SyncedLines and metadata back to an LRC string
 */
export function exportToLRC(lines: SyncedLine[], metadata?: Record<string, string>): string {
  const result: string[] = [];

  if (metadata) {
    if (metadata.title) result.push(`[ti:${metadata.title}]`);
    if (metadata.artist) result.push(`[ar:${metadata.artist}]`);
    if (metadata.album) result.push(`[al:${metadata.album}]`);
    if (metadata.offset) result.push(`[offset:${metadata.offset}]`);
    result.push('');
  }

  for (const line of lines) {
    const timeTag = formatLrcTimestamp(line.time);
    const content = line.translation ? `${line.text} | ${line.translation}` : line.text;
    result.push(`${timeTag} ${content}`);
  }

  return result.join('\n');
}

/**
 * Strips LRC time tags from text to get pure plain lyrics
 */
export function stripLrcTags(lrcContent: string): string {
  return lrcContent
    .replace(/\[\d{1,2}:\d{2}(?:[.:]\d{1,3})?\]/g, '')
    .replace(/^\[[a-zA-Z]+:[^\]]*\]\r?\n?/gm, '')
    .replace(/^[ \t]+/gm, '')
    .trim();
}
