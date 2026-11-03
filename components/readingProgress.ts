// Reading position only: a transcript match is not a pronunciation score.
export function readingWords(text: string): string[] {
  return text.normalize("NFKC").toLocaleLowerCase()
    .replace(/[’']/g, "")
    .match(/[\p{L}\p{N}]+/gu) ?? [];
}

export function readingSentences(text: string) {
  let wordEnd = 0;
  return (text.match(/[^.!?\n]+(?:[.!?]+[ \t]*|\n+|$)|[.!?\n]+/g) ?? [])
    .map((sentence) => {
      const wordStart = wordEnd;
      wordEnd += readingWords(sentence).length;
      return { text: sentence, wordStart, wordEnd };
    });
}

// Align the spoken words with a prefix of the reference passage. Insertions,
// omissions and recognizer substitutions are tolerated without flagging errors.
// Recompute for each result because interim recognition can revise earlier words.
export function readingPosition(reference: string[], spokenText: string): number {
  const spoken = readingWords(spokenText);
  if (!reference.length || !spoken.length) return -1;
  let previous = reference.map((_, index) => index + 1);
  previous.unshift(0);
  for (let i = 0; i < spoken.length; i++) {
    const current = [i + 1];
    for (let j = 1; j <= reference.length; j++) {
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (spoken[i] === reference[j - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  let best = -1;
  let cost = spoken.length;
  for (let j = 1; j <= reference.length; j++) {
    // Require an actual match at the current position; noise alone must not
    // advance the passage. Prefer the earliest prefix when scores tie.
    if (reference[j - 1] === spoken[spoken.length - 1] && previous[j] < cost) {
      best = j - 1;
      cost = previous[j];
    }
  }
  return best;
}
