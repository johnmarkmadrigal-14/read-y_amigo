import { comparisonWords } from './miscueComparison';

export const PASSAGE_SECTION_WORDS = 70;

/** Use the comparison tokenizer's exact positions while retaining original punctuation and spacing. */
export function passageTokens(text: string) {
  const normalized = text.normalize('NFC');
  let cursor = 0;
  return comparisonWords(normalized).map((word, index) => {
    const start = normalized.indexOf(word, cursor);
    const end = start + word.length;
    const prefix = normalized.slice(cursor, start);
    cursor = end;
    return { word, index, start, end, prefix };
  });
}

export function passageSection(text: string, section: number) {
  const normalized = text.normalize('NFC');
  const tokens = passageTokens(normalized);
  const count = Math.max(1, Math.ceil(tokens.length / PASSAGE_SECTION_WORDS));
  const page = Math.min(Math.max(0, section), count - 1);
  const words = tokens.slice(page * PASSAGE_SECTION_WORDS, (page + 1) * PASSAGE_SECTION_WORDS)
    .map((token, index) => page > 0 && index === 0 ? { ...token, prefix: '' } : token);
  const last = words[words.length - 1];
  const next = tokens[(page + 1) * PASSAGE_SECTION_WORDS];
  const suffix = last ? normalized.slice(last.end, next ? next.start : normalized.length) : normalized;
  return { words, suffix, count, page };
}
