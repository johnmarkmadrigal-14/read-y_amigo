/** Transcript alignment suggests review events, never a Phil-IRI error score. */
export const miscueKinds = ['omission', 'substitution', 'insertion', 'repetition', 'mispronunciation', 'hesitation', 'self-correction', 'dialect-variation'] as const;
export type MiscueKind = typeof miscueKinds[number];
export type MiscueEvent = {
  id: string; kind: MiscueKind; status: 'pending' | 'confirmed' | 'dismissed';
  passageStart: number; passageEnd: number; transcriptStart: number; transcriptEnd: number;
  source: 'comparison' | 'teacher'; note: string;
};
export type MiscueReview = {
  comparedThrough?: number;
  algorithmVersion: 'v1'; events: MiscueEvent[]; listened: boolean;
  reviewedAt?: string; reviewedBy?: string;
};
export function comparisonWords(text: string): string[] {
  return text.normalize('NFC').match(/[\p{L}\p{N}][\p{L}\p{M}\p{N}]*(?:(?:['’\-‐‑][\p{L}\p{N}][\p{L}\p{M}\p{N}]*)|(?:[.,](?=\p{N})\p{N}+))*/gu) ?? [];
}
const normalize = (s: string) => s.toLowerCase().replace(/’/g, "'").replace(/[‐‑]/g, '-');
export function compareTranscript(passage: string, transcript: string, coverage?: number): MiscueEvent[] {
  const words = comparisonWords(passage);
  if (coverage !== undefined && (!Number.isSafeInteger(coverage) || coverage < 1 || coverage > words.length)) throw new Error('Invalid passage coverage.');
  const p = words.slice(0, coverage).map(normalize);
  const t = comparisonWords(transcript).map(normalize);
  if (!p.length || !t.length) throw new Error('A confirmed passage and nonempty final transcript are needed. Review audio manually when transcription is unavailable.');
  if ((p.length + 1) * (t.length + 1) > 2000000) throw new Error('This comparison is too long. Review the recording manually.');
  const width = t.length + 1;
  const d = new Uint32Array((p.length + 1) * width);
  for (let i = 0; i <= p.length; i++) d[i * width] = i;
  for (let j = 0; j <= t.length; j++) d[j] = j;
  for (let i = 1; i <= p.length; i++) for (let j = 1; j <= t.length; j++)
    d[i * width + j] = Math.min(d[(i - 1) * width + j] + 1, d[i * width + j - 1] + 1, d[(i - 1) * width + j - 1] + (p[i - 1] === t[j - 1] ? 0 : 1));
  const steps: { kind: 'match' | 'omission' | 'insertion' | 'substitution'; i: number; j: number }[] = [];
  let i = p.length, j = t.length;
  while (i || j) {
    const value = d[i * width + j];
    if (i && j && p[i - 1] === t[j - 1] && value === d[(i - 1) * width + j - 1]) { steps.push({ kind: 'match', i: --i, j: --j }); }
    else if (i && j && value === d[(i - 1) * width + j - 1] + 1) { steps.push({ kind: 'substitution', i: --i, j: --j }); }
    else if (i && value === d[(i - 1) * width + j] + 1) { steps.push({ kind: 'omission', i: --i, j }); }
    else { steps.push({ kind: 'insertion', i, j: --j }); }
  }
  const events: MiscueEvent[] = [];
  let previous = '';
  for (const step of steps.reverse()) {
    if (step.kind === 'match') { previous = ''; continue; }
    const pe = step.i + (step.kind === 'insertion' ? 0 : 1);
    const te = step.j + (step.kind === 'omission' ? 0 : 1);
    const last = events[events.length - 1];
    if (previous === step.kind && last && last.passageEnd === step.i && last.transcriptEnd === step.j) { last.passageEnd = pe; last.transcriptEnd = te; }
    else events.push({ id: `v1-${events.length}`, kind: step.kind, status: 'pending', passageStart: step.i, passageEnd: pe, transcriptStart: step.j, transcriptEnd: te, source: 'comparison', note: '' });
    previous = step.kind;
  }
  for (const e of events) if (e.kind === 'insertion') {
    const extra = t.slice(e.transcriptStart, e.transcriptEnd);
    const n = extra.length;
    const same = (a: string[]) => a.length === n && a.every((word, k) => word === extra[k]);
    if (same(t.slice(Math.max(0, e.transcriptStart - n), e.transcriptStart)) || same(t.slice(e.transcriptEnd, e.transcriptEnd + n))) e.kind = 'repetition';
  }
  if (events.length > 1000) throw new Error('Too many differences for a useful comparison. Review audio manually.');
  return events;
}
