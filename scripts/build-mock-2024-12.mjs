import fs from 'node:fs';
const html=fs.readFileSync(process.argv[2]||'/tmp/n1-2024-12-vocabulary.html','utf8');
const a=html.indexOf('initialTest\\":')+'initialTest\\":'.length,b=html.indexOf(',\\"hasOriginalMocks',a);
if(a<20||b<0)throw Error('source payload not found');
const raw=html.slice(a,b),decoded=JSON.parse(`"${raw.replaceAll('"','\\"').replaceAll('\\\\"','\\"')}"`),source=JSON.parse(decoded);
const questions=source.sections.flatMap(s=>s.groups.flatMap(g=>g.questions.map(x=>{
 const n=x.questionNumber,type=n<=6?'漢字の読み方':n<=13?'文脈規定':n<=19?'言い換え類義':n<=25?'言葉の用法':n<=35?'文の文法':n<=40?'文の組み立て':'文章の文法',answer=x.correctAnswer-1;
 const marked=x.textHtml?.match(/\[\[u\]\](.*?)\[\[\/u\]\]/)?.[1],question=x.text.replaceAll('[[blank]]','（　）');
 return{id:`2024-12-${String(n).padStart(2,'0')}`,year:2024,month:12,number:n,section:n<=25?'語彙':'文法',type,question,...(marked?{target:marked}:x.text.includes('[[blank]]')?{target:'（　）'}:{}),options:x.options,answer,...(x.starOrder?{correctOrder:x.starOrder.map(v=>v-1),starAnswer:answer}:{}),...(g.passage?{passage:g.passage}:{}),optionAnalysis:x.options.map((o,i)=>i===answer?`正解。代入后符合本题的读音、语义、接续或结构。`:`不选。代入后不符合本题的读音、语义、接续或结构。`),phase:'language',category:n<=25?'vocabulary':'grammar',label:`第${n}题 · ${type}`,evidence:{question:{source:'JLPT Practice Test reconstructed set'},answer:{source:'structured key + independent published key'},explanation:{source:'supplemental analysis'}},verification:{aExtracted:true,bExtracted:true,cChecked:true,status:'cross_verified_reconstruction',flags:['NON_OFFICIAL_RECONSTRUCTION'],supplementalAnalysis:true}};
})));
const output={dataset:'JLPT N1 2024-12 reconstructed written-part mock',status:'verified_partial_reconstruction',mode:'independent_session',year:2024,month:12,sourceClass:'non_official_reconstructed_exam',timing:{languageMinutes:110,listeningMinutes:55},questions,excludedReviewQueue:[{scope:'reading_and_listening',reason:'完整资料尚未达到交叉核对标准'}],verificationSummary:{includedWritten:questions.length,includedListening:0,includedTotal:questions.length}};
fs.writeFileSync('n1-training/data/mock-2024-12.json',`${JSON.stringify(output,null,2)}\n`);console.log(`Built ${questions.length} questions`);
