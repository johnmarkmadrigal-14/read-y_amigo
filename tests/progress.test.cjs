const test = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const { Module } = require('node:module');
const filename = require('node:path').resolve(__dirname, '../components/progress/data.ts');
const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const compiled = new Module(filename, module); compiled._compile(output, filename);
const { comprehensionLevel, metricNumber, metricText, finalPercentage, historyInRange, latestMetrics } = compiled.exports;
test('comprehension boundaries use final correctness percentage, never weighted points or rounded display', () => {
  for (const [score, level] of [[0,'Frustration'],[58.99,'Frustration'],[59,'Instructional'],[60,'Instructional'],[79.99,'Instructional'],[80,'Independent'],[100,'Independent']]) assert.equal(comprehensionLevel(score),level);
  for (const score of [null,undefined,-1,101,NaN,Infinity]) assert.equal(comprehensionLevel(score),null);
  assert.equal(finalPercentage({status:'pending-review',result:{percentage:100,pendingQuestions:1}}),null);
  assert.equal(finalPercentage({status:'graded',result:{percentage:60,pendingQuestions:0,earnedPoints:9,maxPoints:10}}),60);
});
test('missing, invalid and pending results do not become zeros; actual zero is valid', () => {
  assert.equal(metricText(undefined,'%'),'—');assert.equal(metricText({value:0},'%'),'0%');
  assert.equal(metricNumber({value:Infinity}),null);assert.equal(metricNumber({value:101},true),null);
  assert.equal(metricNumber({value:99,status:'pending-review'},true),null);
  assert.equal(metricText({value:92.31,status:'provisional'},'WPM'),'92.3 WPM');
});
test('history sorts by submission, filters calendar months and preserves missing metric gaps', () => {
  const empty={value:null};
  const rows=[{id:'older',submittedAt:'2026-10-01T12:00:00',speed:{value:70},accuracy:{value:90},comprehension:{value:0}},
    {id:'new',submittedAt:'2026-11-09T12:00:00',speed:empty,accuracy:empty,comprehension:{value:60}},
    {id:'pending',submittedAt:'2026-11-10T12:00:00',speed:{value:92,status:'provisional'},accuracy:empty,comprehension:{value:null,status:'pending-review'}},
    {id:'invalid',submittedAt:'invalid',speed:{value:200},accuracy:{value:100},comprehension:{value:100}}];
  assert.deepEqual(historyInRange(rows,'This month',new Date('2026-11-15T12:00:00')).map(row=>row.id),['pending','new']);
  const summary=latestMetrics(rows);assert.equal(summary.speed.value,92);assert.equal(summary.accuracy.value,90);assert.equal(summary.comprehension.value,60);
  assert.equal(latestMetrics([]).accuracy.value,null);
});
