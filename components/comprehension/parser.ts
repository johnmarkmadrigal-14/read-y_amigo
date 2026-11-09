import type { QuestionType, QuizQuestion } from './types';
export const sampleQuiz = `1. What did Mara plant?\nA. A seed\nB. A stone\nC. A ribbon\nANSWER: A\n\n2. Why did the seed grow?\nA. She watered it daily\nB. She kept it in a box\nC. She stopped caring for it\nANSWER: A`;
export function parseQuiz(source: string): QuizQuestion[] {
  if (!source.trim() || source.length > 80000) throw new Error('Paste questions using the numbered format (up to 80,000 characters).');
  const blocks = source.trim().split(/\n(?=[ \t]*\d+[.)][ \t])/u);
  if (blocks.length > 100) throw new Error('Use at most 100 questions.');
  return blocks.map((block, index) => {
    const lines = block.trim().split(/\r?\n/u).map(line => line.trim()).filter(Boolean);
    const first = lines.shift()?.match(/^\d+[.)]\s+(.+)$/u);
    if (!first) throw new Error(`Question ${index + 1}: start with a number, e.g. 1. Your question.`);
    const choices: string[] = [], fields: Record<string, string> = {};
    for (const line of lines) {
      const field = line.match(/^(TYPE|ANSWER|POINTS|GUIDE|RUBRIC|SUPPORT):\s*(.*)$/iu);
      if (field) { const key = field[1].toUpperCase(); if (fields[key] !== undefined) throw new Error(`Question ${index + 1}: duplicate ${key}.`); fields[key] = field[2]; continue; }
      const choice = line.match(/^([A-L])[.)]\s+(.+)$/iu);
      if (!choice || choice[1].toUpperCase().charCodeAt(0) - 65 !== choices.length) throw new Error(`Question ${index + 1}: put choices on separate lines in A, B, C order. Use GUIDE:, RUBRIC:, or SUPPORT: for teacher notes.`);
      choices.push(choice[2]);
    }
    const type = (fields.TYPE?.toLowerCase() || 'multiple-choice') as QuestionType;
    if (!['multiple-choice', 'true-false', 'checkboxes', 'short-answer', 'essay'].includes(type)) throw new Error(`Question ${index + 1}: invalid TYPE.`);
    const manual = type === 'short-answer' || type === 'essay';
    const resolvedChoices = type === 'true-false' ? ['True', 'False'] : choices;
    const points = fields.POINTS === undefined ? 1 : Number(fields.POINTS);
    if (!Number.isFinite(points) || points <= 0 || points > 1000) throw new Error(`Question ${index + 1}: POINTS must be greater than 0 and at most 1,000.`);
    const q: QuizQuestion = { type, question: first[1], points, expectedAnswer: fields.GUIDE || (manual ? fields.ANSWER : undefined), rubric: fields.RUBRIC, supportingParagraph: fields.SUPPORT };
    if (manual) {
      if (choices.length) throw new Error(`Question ${index + 1}: written responses do not use choices.`);
      if (type === 'essay' && !q.rubric) throw new Error(`Question ${index + 1}: include RUBRIC: for the essay.`);
    } else {
      if (resolvedChoices.length < 2 || resolvedChoices.length > 12 || new Set(resolvedChoices.map(c => c.toLocaleLowerCase())).size !== resolvedChoices.length) throw new Error(`Question ${index + 1}: use 2–12 distinct choices.`);
      let answer = fields.ANSWER?.toUpperCase();
      if (type === 'true-false') {
        if (choices.length && JSON.stringify(choices.map(c => c.toLowerCase())) !== JSON.stringify(['true', 'false'])) throw new Error(`Question ${index + 1}: true/false choices must be True then False, or omit choices.`);
        if (answer === 'TRUE') answer = 'A'; if (answer === 'FALSE') answer = 'B';
      }
      if (!answer) throw new Error(`Question ${index + 1}: include ANSWER: followed by the correct letter.`);
      const keys = answer.split(',').map(part => part.trim());
      if (keys.some(key => !/^[A-L]$/u.test(key)) || new Set(keys).size !== keys.length) throw new Error(`Question ${index + 1}: invalid answer letters.`);
      const indices = keys.map(key => key.charCodeAt(0) - 65).sort((a, b) => a - b);
      if (indices.some(i => i >= resolvedChoices.length) || (type !== 'checkboxes' && indices.length !== 1)) throw new Error(`Question ${index + 1}: answer key does not match the choices.`);
      q.choices = resolvedChoices; q.correctAnswer = type === 'checkboxes' ? indices : indices[0];
    }
    return q;
  });
}
export function formatQuiz(questions: QuizQuestion[]) {
  return questions.map((q, i) => `${i + 1}. ${q.question}\nTYPE: ${q.type}\n${q.choices?.map((choice, j) => `${String.fromCharCode(65 + j)}. ${choice}`).join('\n') || ''}\n${q.correctAnswer !== undefined ? `ANSWER: ${(Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer]).map(index => String.fromCharCode(65 + index)).join(', ')}` : ''}\nPOINTS: ${q.points}\n${q.expectedAnswer ? `GUIDE: ${q.expectedAnswer}` : ''}\n${q.rubric ? `RUBRIC: ${q.rubric}` : ''}\n${q.supportingParagraph ? `SUPPORT: ${q.supportingParagraph}` : ''}`.trim()).join('\n\n');
}
