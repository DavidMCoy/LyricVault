import { describe, it, expect } from 'vitest';
import { 
  parseTimeStamp, 
  formatLrcTimestamp, 
  formatTimeDisplay, 
  parseLRC, 
  getActiveLineIndex, 
  exportToLRC, 
  stripLrcTags 
} from './lrcParser';

describe('LRC Parser & Time Utils', () => {
  it('parses timestamps correctly', () => {
    expect(parseTimeStamp('[00:12.34]')).toBeCloseTo(12.34, 2);
    expect(parseTimeStamp('[01:05.500]')).toBeCloseTo(65.5, 2);
    expect(parseTimeStamp('02:30')).toBeCloseTo(150.0, 2);
    expect(parseTimeStamp('invalid')).toBeNull();
  });

  it('formats seconds into LRC timestamp tags', () => {
    expect(formatLrcTimestamp(12.34)).toBe('[00:12.34]');
    expect(formatLrcTimestamp(65.5)).toBe('[01:05.50]');
    expect(formatLrcTimestamp(0)).toBe('[00:00.00]');
  });

  it('formats display time mm:ss', () => {
    expect(formatTimeDisplay(75)).toBe('01:15');
    expect(formatTimeDisplay(3599)).toBe('59:59');
  });

  it('parses full LRC documents with metadata', () => {
    const lrcContent = `[ti:Bohemian Rhapsody]
[ar:Queen]
[al:A Night at the Opera]
[offset:+500]
[00:01.00]Is this the real life?
[00:05.50]Is this just fantasy?
[00:10.00]Caught in a landslide`;

    const parsed = parseLRC(lrcContent);
    expect(parsed.hasSync).toBe(true);
    expect(parsed.metadata.ti).toBe('Bohemian Rhapsody');
    expect(parsed.metadata.ar).toBe('Queen');
    expect(parsed.lines.length).toBe(3);
    // Note offset +500ms adds 0.5s to times
    expect(parsed.lines[0].time).toBeCloseTo(1.50, 2);
    expect(parsed.lines[0].text).toBe('Is this the real life?');
  });

  it('handles XLRC translation format', () => {
    const xlrcContent = `[00:10.00] Konnichiwa | Hello`;
    const parsed = parseLRC(xlrcContent);
    expect(parsed.lines[0].text).toBe('Konnichiwa');
    expect(parsed.lines[0].translation).toBe('Hello');
  });

  it('correctly calculates active line index', () => {
    const lines = [
      { time: 5, text: 'Line 1' },
      { time: 10, text: 'Line 2' },
      { time: 15, text: 'Line 3' },
    ];

    expect(getActiveLineIndex(lines, 0)).toBe(-1);
    expect(getActiveLineIndex(lines, 4.9)).toBe(-1);
    expect(getActiveLineIndex(lines, 5.0)).toBe(0);
    expect(getActiveLineIndex(lines, 7.5)).toBe(0);
    expect(getActiveLineIndex(lines, 10.0)).toBe(1);
    expect(getActiveLineIndex(lines, 20.0)).toBe(2);
  });

  it('exports parsed lines back to valid LRC string', () => {
    const lines = [
      { time: 5.5, text: 'First line' },
      { time: 10.0, text: 'Second line' },
    ];
    const exported = exportToLRC(lines, { title: 'Test', artist: 'Tester' });
    expect(exported).toContain('[ti:Test]');
    expect(exported).toContain('[ar:Tester]');
    expect(exported).toContain('[00:05.50] First line');
    expect(exported).toContain('[00:10.00] Second line');
  });

  it('strips LRC tags cleanly for plain text display', () => {
    const lrc = `[ti:Title]\n[00:01.00] Line one\n[00:05.00] Line two`;
    const stripped = stripLrcTags(lrc);
    expect(stripped).toBe('Line one\nLine two');
  });
});
