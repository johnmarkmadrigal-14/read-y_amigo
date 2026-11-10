const test=require('node:test'),assert=require('node:assert/strict'),ts=require('typescript'),fs=require('node:fs'),path=require('node:path'),{Module}=require('node:module');
function load(relative,dependencies={}){const filename=path.resolve(__dirname,'..',relative);const compiled=new Module(filename,module);compiled.require=name=>name in dependencies?dependencies[name]:require(name);compiled._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);return compiled.exports;}
test('report calendar periods use local month bounds and roll January into the previous year',()=>{
 const {periodQuery}=load('components/reports/data.ts');
 assert.equal(periodQuery('All time'),'');
 const now=new Date(2026,0,15);const params=new URLSearchParams(periodQuery('Last month',now).slice(1));assert.equal(params.get('from'),new Date(2025,11,1).toISOString());assert.equal(params.get('to'),new Date(2026,0,1).toISOString());
 const month=new URLSearchParams(periodQuery('This month',now).slice(1));assert.equal(month.get('from'),new Date(2026,0,1).toISOString());assert.equal(month.get('to'),new Date(2026,1,1).toISOString());
});
test('report charts retain missing values and separate WPM from percentages',()=>{
 const {reportTrendRows}=load('components/reports/data.ts');const metrics={speed:{value:92},accuracy:{value:null},comprehension:{value:0}};
 const rows=reportTrendRows({trend:[{date:'2026-11-01',metrics},{date:'2026-11-10',metrics}]});assert.equal(rows[0].id,'2026-11-10');assert.equal(rows[0].speed.value,92);assert.equal(rows[0].accuracy.value,null);assert.equal(rows[0].comprehension.value,0);
});
test('shared quiz client dispatches standalone writes and grading separately from passage quizzes',async()=>{
 const calls=[];const api=load('components/comprehension/api.ts',{'../../app/lib/api':{authRequest:async(path,options)=>{calls.push({path,options});return{}}}});
 const attempt={_id:'a',assessmentType:'standalone',revision:2};await api.saveComprehension(attempt,[{questionId:'q1',answer:0}],false);assert.equal(calls.at(-1).path,'/quizzes/attempts/a/draft');assert.equal(calls.at(-1).options.body.revision,2);
 await api.saveComprehension(attempt,[],true);assert.equal(calls.at(-1).path,'/quizzes/attempts/a/submit');await api.gradeComprehension(attempt,[]);assert.equal(calls.at(-1).path,'/quizzes/attempts/a/grade');await api.teacherAttempts('w',true);assert.equal(calls.at(-1).path,'/quizzes/classwork/w/attempts');
 await api.saveComprehension({...attempt,assessmentType:'passage'},[],false);assert.equal(calls.at(-1).path,'/comprehension/attempts/a/draft');await api.standaloneQuizResults('c');assert.equal(calls.at(-1).path,'/quizzes/mine?classId=c');assert.equal(calls.at(-1).options,undefined,'listing results is read-only');
});
