import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseQuiz, formatQuiz, sampleQuiz } from '../components/comprehension/parser.ts';
test('bulk paste parses the preview example and round-trips reusable sets',()=>{
 const questions=parseQuiz(sampleQuiz);assert.equal(questions.length,2);assert.equal(questions[0].correctAnswer,0);assert.deepEqual(parseQuiz(formatQuiz(questions)),questions);
});
test('mixed types, exact checkbox keys, teacher guides and rubric stay distinct',()=>{
 const questions=parseQuiz('1. Select two\nTYPE: checkboxes\nA. One\nB. Two\nC. Three\nANSWER: C, A\nPOINTS: 3\n\n2. Is it true?\nTYPE: true-false\nANSWER: FALSE\n\n3. Explain\nTYPE: short-answer\nGUIDE: Teacher only\n\n4. Discuss\nTYPE: essay\nRUBRIC: Evidence and reasoning\nSUPPORT: Paragraph 2');
 assert.deepEqual(questions[0].correctAnswer,[0,2]);assert.equal(questions[1].correctAnswer,1);assert.equal(questions[2].expectedAnswer,'Teacher only');assert.equal(questions[3].rubric,'Evidence and reasoning');
 assert.deepEqual(parseQuiz(formatQuiz(questions)),questions);
});
test('rejects malformed keys, repeated fields, invalid choices, missing rubrics and oversized input',()=>{
 for(const source of ['plain text','1. Q\nA. x\nB. y','1. Q\nA. x\nC. y\nANSWER: A','1. Q\nA. x\nB. y\nANSWER: C','1. Q\nA. x\nB. x\nANSWER: A','1. Q\nA. x\nB. y\nANSWER: A\nANSWER: B','1. Q\nTYPE: essay','1. Q\nA. x\nB. y\nANSWER: A\nPOINTS: -2','a'.repeat(80001)]) assert.throws(()=>parseQuiz(source));
});
