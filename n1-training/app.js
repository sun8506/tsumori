let questions=[];
let dataset=null;
let mode='vocabulary';
let listeningYear='2017-07';
let current=0,answered=0,correct=0,locked=false;
let selectedOrder=[];
let mistakes=[];
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const sourceLabel=q=>`${q.year}年${q.month}月 · 第${q.number}题 · 原卷p.${q.evidence?.question?.page??'—'}`;
const tipFor=q=>({'漢字の読み方':'读音与形近假名','文脈規定':'固定搭配与语境','文脈に合う語':'固定搭配与语境','言い換え類義':'近义表达辨析','意味の近い語':'近义表达辨析','用法':'搭配与正确用法','言葉の用法':'搭配与正确用法','文の文法':'语法形式与接续','文の組み立て':'句子排列与结构','文章の文法':'篇章衔接与语境','内容理解（短文）':'定位原文、辨认主体与排除偷换'}[q.type]||q.type);
const modeConfig={vocabulary:{path:'./data/questions.combined.json',crumb:'N1 / 词汇',title:'词汇突击'},grammar:{path:'./data/grammar.combined.json',crumb:'N1 / 语法',title:'语法突击'},ordering:{path:'./data/ordering.combined.json',crumb:'N1 / 排序',title:'排序突击'},cloze:{path:'./data/cloze.combined.json',crumb:'N1 / 完形',title:'完形突击'},shortReading:{path:'./data/short-reading.combined.json',crumb:'N1 / 短篇阅读',title:'短篇阅读'},mediumReading:{path:'./data/medium-reading.combined.json',crumb:'N1 / 中篇阅读',title:'中篇阅读'},longReading:{path:'./data/long-reading.combined.json',crumb:'N1 / 长篇阅读',title:'长篇阅读'},listening:{path:'./data/listening-2017-07.json',crumb:'N1 / 听力 / 2017年7月',title:'听力突击'}};
const belongsToMode=(question,nextMode)=>{
  if(nextMode==='grammar')return question.number>=26&&question.number<=35;
  if(nextMode==='ordering')return question.number>=36&&question.number<=40;
  if(nextMode==='cloze')return question.number>=41&&question.number<=45;
  if(nextMode==='shortReading')return question.number>=46&&question.number<=49;
  if(nextMode==='mediumReading')return question.number>=50&&question.number<=58;
  if(nextMode==='longReading')return question.number>=59&&question.number<=62;
  if(nextMode==='listening')return `${question.year}-${String(question.month).padStart(2,'0')}`===listeningYear;
  return true;
};
const mistakeKey=()=>mode==='listening'?`n1-listening-${listeningYear}-mistakes`:`n1-${mode}-mistakes`;
const legacyTargets={'2018-07-01':'回顧','2018-07-02':'偽り','2018-07-03':'嫌悪感','2018-07-04':'自粛','2018-07-05':'戒めたい','2018-07-06':'丘陵','2018-07-07':'（　）','2018-07-08':'（　）','2018-07-09':'（　）','2018-07-10':'（　）','2018-07-11':'（　）','2018-07-12':'（　）','2018-07-13':'（　）','2018-07-14':'すみやかに','2018-07-15':'漠然としていた','2018-07-16':'妨害する','2018-07-17':'エレガントな','2018-07-18':'つかの間','2018-07-19':'しくじって','2018-07-20':'巧み','2018-07-21':'配属','2018-07-22':'乗り出す','2018-07-23':'面識','2018-07-24':'抜粋','2018-07-25':'心当たり'};
function shuffle(items){
  const result=[...items];
  for(let i=result.length-1;i>0;i--){
    const values=new Uint32Array(1);crypto.getRandomValues(values);
    const j=Math.floor(values[0]/4294967296*(i+1));
    [result[i],result[j]]=[result[j],result[i]];
  }
  return result;
}
function questionHtml(q){
  const target=q.target||legacyTargets[q.id];
  if(!target)return esc(q.question);
  const start=q.question.indexOf(target);
  if(start<0)return esc(q.question);
  return `${esc(q.question.slice(0,start))}<mark class="question-target">${esc(target)}</mark>${esc(q.question.slice(start+target.length))}`;
}

function render(){
  const q=questions[current]; if(!q)return; locked=false;selectedOrder=[];
  $('#total').textContent=questions.length; $('#answered').textContent=answered;
  $('#accuracy').textContent=answered?Math.round(correct/answered*100)+'%':'—';
  $('#reviewCount').textContent=mistakes.length; $('#mistakeCount').textContent=mistakes.length;
  $('#streakValue').textContent=answered; $('#progressBar').style.width=(answered/questions.length*100)+'%';
  const verified=q.verification?.status==='verified';
  if(q.interaction==='ordering')renderOrderingQuestion(q,verified);
  else if(q.interaction==='cloze')renderClozeQuestion(q,verified);
  else if(mode==='listening')renderListeningQuestion(q,verified);
  else if(mode==='shortReading'||mode==='mediumReading'||mode==='longReading')renderShortReadingQuestion(q,verified);
  else{
    $('#questionPanel').innerHTML=`<div class="question-meta"><span>${String(current+1).padStart(2,'0')} / ${String(questions.length).padStart(2,'0')}</span><span><span class="verify-badge ${verified?'verified':''}">${verified?'已核对':'待核对'}</span><span class="tag">${esc(q.type)}</span></span></div><p class="question-text">${questionHtml(q)}</p><div class="options">${q.options.map((o,i)=>`<button class="option" data-i="${i}"><span class="num">${String.fromCharCode(65+i)}</span>${esc(o)}</button>`).join('')}</div><div class="next-row"><span class="source">来源：${sourceLabel(q)}</span><button class="primary skip-ready" id="nextBtn">跳过此题</button></div>`;
    document.querySelectorAll('.option').forEach(b=>b.onclick=()=>choose(+b.dataset.i)); $('#nextBtn').onclick=next;
  }
}

function renderListeningQuestion(q,verified){
  const yearMonth=`${q.year}-${String(q.month).padStart(2,'0')}`;
  const files=q.audioFiles||[q.audioFile].filter(Boolean).concat(q.audioFile?[]:(q.audioTracks||[q.audioTrack]).filter(Boolean).map(track=>`${String(track).padStart(2,'0')}.mp3`));
  const players=files.map((file,index)=>`<div class="audio-track"><span>${files.length>1?`音频 ${index+1}`:'本题音频'} · ${esc(file)}</span><audio controls preload="metadata" src="./audio/${yearMonth}/${encodeURIComponent(file)}"></audio></div>`).join('');
  $('#questionPanel').innerHTML=`<div class="question-meta"><span>${String(current+1).padStart(2,'0')} / ${String(questions.length).padStart(2,'0')}</span><span><span class="year-badge">${q.year}年${q.month}月</span><span class="verify-badge ${verified?'verified':''}">${verified?'音轨/原文已核对':'待核对'}</span><span class="tag">${esc(q.type)}</span></span></div><div class="listening-player"><div class="listening-player-head"><div><small>按年份顺序训练</small><strong>问题 ${q.section} · ${esc(q.displayNumber||q.questionNumber)}</strong></div><div class="audio-settings"><label>年份 <select id="listeningYear"><option value="2015-07" ${listeningYear==='2015-07'?'selected':''}>2015年7月</option><option value="2016-12" ${listeningYear==='2016-12'?'selected':''}>2016年12月</option><option value="2017-07" ${listeningYear==='2017-07'?'selected':''}>2017年7月</option><option value="2017-12" ${listeningYear==='2017-12'?'selected':''}>2017年12月</option></select></label><label>速度 <select id="audioRate"><option value="0.8">0.8×</option><option value="1" selected>1.0×</option><option value="1.2">1.2×</option></select></label></div></div>${players}<div class="audio-shortcuts"><button type="button" class="ghost" id="rewindBtn">−3 秒</button><button type="button" class="ghost" id="replayBtn">从头播放</button><button type="button" class="ghost" id="forwardBtn">+3 秒</button></div><output class="seek-status" id="seekStatus" aria-live="polite"></output></div>${q.printedPrompt?`<p class="listening-prompt">${esc(q.printedPrompt)}</p>`:''}<div class="options">${q.options.map((o,i)=>`<button class="option" data-i="${i}"><span class="num">${i+1}</span>${esc(o)}</button>`).join('')}</div><div class="next-row"><span class="source">来源：${q.year}年${q.month}月听力 · 问题${q.section}-${esc(q.displayNumber||q.questionNumber)} · ${files.map(esc).join(' + ')}</span><button class="primary skip-ready" id="nextBtn">跳过此题</button></div>`;
  const audios=[...document.querySelectorAll('audio')];
  const active=()=>audios.find(audio=>!audio.paused)||audios[0];
  $('#audioRate').onchange=event=>audios.forEach(audio=>audio.playbackRate=+event.target.value);
  $('#listeningYear').onchange=event=>{listeningYear=event.target.value;loadMode('listening')};
  const seekBy=async seconds=>{
    const audio=active();if(!audio)return;
    if(audio.readyState===0){audio.load();await new Promise(resolve=>audio.addEventListener('loadedmetadata',resolve,{once:true}))}
    const limit=Number.isFinite(audio.duration)?audio.duration:audio.currentTime+Math.abs(seconds)+1;
    const target=Math.max(0,Math.min(limit,audio.currentTime+seconds));
    if(typeof audio.fastSeek==='function')audio.fastSeek(target);else audio.currentTime=target;
    $('#seekStatus').textContent=`已跳到 ${Math.floor(target/60)}:${String(Math.floor(target%60)).padStart(2,'0')}`;
  };
  $('#rewindBtn').onclick=()=>seekBy(-3);
  $('#forwardBtn').onclick=()=>seekBy(3);
  $('#replayBtn').onclick=()=>{audios.forEach(audio=>{audio.pause();audio.currentTime=0});audios[0]?.play()};
  document.querySelectorAll('.option').forEach(button=>button.onclick=()=>choose(+button.dataset.i));
  $('#nextBtn').onclick=next;
}

function renderShortReadingQuestion(q,verified){
  const groupSize=mode==='mediumReading'?3:mode==='longReading'?4:1;
  const baseNumber=mode==='mediumReading'?50:mode==='longReading'?59:q.number;
  const position=groupSize>1?`文章 ${Math.floor(current/groupSize)+1} / ${Math.ceil(questions.length/groupSize)} · 第 ${((q.number-baseNumber)%groupSize)+1} / ${groupSize} 题`:`${String(current+1).padStart(2,'0')} / ${String(questions.length).padStart(2,'0')}`;
  $('#questionPanel').innerHTML=`<div class="question-meta"><span>${position}</span><span><span class="verify-badge ${verified?'verified':''}">${verified?'原文已核对':'待核对'}</span><span class="tag">${esc(q.type)}</span></span></div><article class="reading-card">${q.passageTitle?`<h3>${esc(q.passageTitle)}</h3>`:''}<div class="reading-passage">${esc(q.passage).replaceAll('\n','<br>')}</div>${q.attribution?`<p class="cloze-attribution">${esc(q.attribution)}</p>`:''}</article><p class="reading-question">${esc(q.question)}</p><div class="options">${q.options.map((o,i)=>`<button class="option" data-i="${i}"><span class="num">${String.fromCharCode(65+i)}</span>${esc(o)}</button>`).join('')}</div><div class="next-row"><span class="source">来源：${sourceLabel(q)}</span><button class="primary skip-ready" id="nextBtn">跳过此题</button></div>`;
  document.querySelectorAll('.option').forEach(button=>button.onclick=()=>choose(+button.dataset.i));$('#nextBtn').onclick=next;
}

function clozePassageHtml(q){
  const parts=q.passage.split(/(\[\[(?:41|42|43|44|45)\]\])/g);
  return parts.map(part=>{const match=part.match(/^\[\[(\d+)\]\]$/);if(!match)return esc(part);const number=+match[1],blank=number-40;return `<mark class="cloze-blank ${number===q.clozeNumber?'active':''}">${number===q.clozeNumber?'第 '+blank+' 空':'['+blank+']'}</mark>`}).join('').replaceAll('\n','<br>');
}
function renderClozeQuestion(q,verified){
  const article=Math.floor(current/5)+1,totalArticles=Math.ceil(questions.length/5),blank=q.clozeNumber-40;
  $('#questionPanel').innerHTML=`<div class="question-meta"><span>文章 ${article} / ${totalArticles} · 第 ${blank} / 5 空</span><span><span class="verify-badge ${verified?'verified':''}">${verified?'全文已核对':'待核对'}</span><span class="tag">${esc(q.type)} · 第${blank}空</span></span></div><article class="cloze-card">${q.passageTitle?`<h3>${esc(q.passageTitle)}</h3>`:''}<div class="cloze-passage">${clozePassageHtml(q)}</div>${q.footnotes?.length?`<details class="cloze-notes"><summary>注释 ${q.footnotes.length} 条</summary>${q.footnotes.map(note=>`<p>${esc(note)}</p>`).join('')}</details>`:''}${q.attribution?`<p class="cloze-attribution">${esc(q.attribution)}</p>`:''}</article><div class="options">${q.options.map((o,i)=>`<button class="option" data-i="${i}"><span class="num">${String.fromCharCode(65+i)}</span>${esc(o)}</button>`).join('')}</div><div class="next-row"><span class="source">来源：${sourceLabel(q)}</span><button class="primary skip-ready" id="nextBtn">跳过此题</button></div>`;
  document.querySelectorAll('.option').forEach(button=>button.onclick=()=>choose(+button.dataset.i));$('#nextBtn').onclick=next;
  requestAnimationFrame(()=>document.querySelector('.cloze-blank.active')?.scrollIntoView({block:'center',behavior:'auto'}));
}

function renderOrderingQuestion(q,verified){
  $('#questionPanel').innerHTML=`<div class="question-meta"><span>${String(current+1).padStart(2,'0')} / ${String(questions.length).padStart(2,'0')}</span><span><span class="verify-badge ${verified?'verified':''}">${verified?'已核对':'待核对'}</span><span class="tag">${esc(q.type)}</span></span></div><p class="question-text">${questionHtml(q)}</p><p class="order-hint">依次点击四个片段完成整个句子；按完整顺序评分，不依赖原卷 ★ 位置。</p><div class="order-slots">${[0,1,2,3].map(i=>`<button class="order-slot" data-slot="${i}"><small>第 ${i+1} 格</small><span>待选择</span></button>`).join('')}</div><div class="options order-options">${q.options.map((o,i)=>`<button class="option order-fragment" data-i="${i}"><span class="num">${String.fromCharCode(65+i)}</span>${esc(o)}</button>`).join('')}</div><div class="next-row"><span class="source">来源：${sourceLabel(q)}</span><div class="answer-actions"><button class="ghost" id="clearOrderBtn" disabled>清空</button><button class="primary" id="submitOrderBtn" disabled>提交排序</button><button class="primary skip-ready" id="nextBtn">跳过此题</button></div></div>`;
  document.querySelectorAll('.order-fragment').forEach(button=>button.onclick=()=>toggleOrder(+button.dataset.i));
  document.querySelectorAll('.order-slot').forEach(button=>button.onclick=()=>removeOrderAt(+button.dataset.slot));
  $('#clearOrderBtn').onclick=()=>{selectedOrder=[];updateOrderingUI(q)};
  $('#submitOrderBtn').onclick=submitOrder;
  $('#nextBtn').onclick=next;
}

function toggleOrder(index){
  if(locked)return;
  const existing=selectedOrder.indexOf(index);
  if(existing>=0)selectedOrder.splice(existing,1);else if(selectedOrder.length<4)selectedOrder.push(index);
  updateOrderingUI(questions[current]);
}
function removeOrderAt(position){if(!locked&&position<selectedOrder.length){selectedOrder.splice(position,1);updateOrderingUI(questions[current])}}
function updateOrderingUI(q){
  document.querySelectorAll('.order-slot').forEach((slot,i)=>{const optionIndex=selectedOrder[i];slot.querySelector('span').textContent=optionIndex===undefined?'待选择':q.options[optionIndex];slot.classList.toggle('filled',optionIndex!==undefined)});
  document.querySelectorAll('.order-fragment').forEach(button=>button.classList.toggle('selected',selectedOrder.includes(+button.dataset.i)));
  $('#submitOrderBtn').disabled=selectedOrder.length!==4;$('#clearOrderBtn').disabled=!selectedOrder.length;
}
function submitOrder(){
  if(locked||selectedOrder.length!==4)return;locked=true;const q=questions[current];
  const ok=selectedOrder.every((value,index)=>value===q.correctOrder[index]);answered++;if(ok)correct++;
  if(!ok&&!mistakes.some(item=>item.id===q.id)){mistakes.push(q);localStorage.setItem(mistakeKey(),JSON.stringify(mistakes))}
  document.querySelectorAll('.order-fragment').forEach(button=>{button.disabled=true;const index=+button.dataset.i;button.classList.remove('selected');button.classList.add(q.correctOrder.includes(index)?'correct':'')});
  document.querySelectorAll('.order-slot').forEach((slot,index)=>slot.classList.add(selectedOrder[index]===q.correctOrder[index]?'correct-slot':'wrong-slot'));
  const fullOrder=q.correctOrder.map(index=>q.options[index]);const fullSentence=q.question.replace(q.target,fullOrder.join(''));
  const starNote=q.orderingVerification?.sourceStarConflict?'原题图片星位与答案资料冲突；本题已按完整句序评分。':`答案表 ★ 位于完整句的第 ${q.starPosition+1} 格。`;
  const box=document.createElement('div');box.className='explanation';box.innerHTML=`<strong>${ok?'排序正确 · 结构已经掌握':'顺序不对 · 已加入错题本'}</strong><p class="correct-order"><b>正确顺序</b> ${fullOrder.map((text,index)=>`<span>${index===q.starPosition?'★ ':''}${esc(text)}</span>`).join('<i>→</i>')}</p><p class="completed-sentence">${esc(fullSentence)}</p><div class="option-analysis">${q.optionAnalysis.map((text,index)=>`<p class="analysis-line ${index===q.starAnswer?'is-answer':''}"><span>${String.fromCharCode(65+index)}</span>${esc(text||'原解析未单独说明此片段；请结合完整句子理解其连接位置。')}</p>`).join('')}</div><div class="memory-tip">答案表星号选项：${String.fromCharCode(65+q.starAnswer)} · ${esc(starNote)} · 解析来源p.${q.evidence?.explanation?.page??'—'}</div>`;
  $('#questionPanel').insertBefore(box,$('.next-row'));$('#submitOrderBtn').remove();$('#clearOrderBtn').remove();$('#nextBtn').classList.remove('skip-ready');$('#nextBtn').textContent=current===questions.length-1?'再来一轮':'下一题';$('#mistakeCount').textContent=mistakes.length;$('#reviewCount').textContent=mistakes.length;
}

function choose(i){
  if(locked)return; locked=true; const q=questions[current],ok=i===q.answer; answered++; if(ok)correct++;
  if(!ok&&!mistakes.some(x=>x.id===q.id)){mistakes.push(q);localStorage.setItem(mistakeKey(),JSON.stringify(mistakes))}
  document.querySelectorAll('.option').forEach((b,n)=>{b.disabled=true;if(n===q.answer)b.classList.add('correct');if(n===i&&!ok)b.classList.add('wrong')});
  const box=document.createElement('div'); box.className='explanation';
  box.innerHTML=`<strong>${ok?'答对了 · 继续保持':'需要回看 · 已加入错题本'}</strong>${mode==='listening'?`<details class="transcript" open><summary>听力原文与提问</summary><div>${esc(q.transcript||'').replaceAll('\n','<br>')}</div>${q.spokenQuestion?`<p><b>提问：</b>${esc(q.spokenQuestion)}</p>`:''}</details>`:''}<div class="option-analysis">${q.optionAnalysis.map((text,n)=>`<p class="analysis-line ${n===q.answer?'is-answer':''}"><span>${mode==='listening'?n+1:String.fromCharCode(65+n)}</span>${esc(text)}</p>`).join('')}</div><div class="memory-tip">${mode==='listening'?'听力提示：先抓人物、目的、转折和最终决定':'记忆提示：'+esc(tipFor(q))} · 解析来源p.${q.evidence?.explanation?.page??'—'}</div>`;
  $('#questionPanel').insertBefore(box,$('.next-row')); $('#nextBtn').classList.remove('skip-ready');
  $('#nextBtn').textContent=current===questions.length-1?'再来一轮':'下一题'; $('#mistakeCount').textContent=mistakes.length; $('#reviewCount').textContent=mistakes.length;
}

function next(){current=(current+1)%questions.length;render()}
function renderMistakes(){
  const list=$('#mistakesList'); $('#mistakeSummary').textContent=`${mistakes.length} 题待复习`;
  list.innerHTML=mistakes.length?mistakes.map(q=>`<div class="mistake-item"><div><p>${esc(q.question)}</p><small>${sourceLabel(q)} · ${esc(q.type)}</small></div><button class="ghost" data-id="${q.id}">开始复习</button></div>`).join(''):'<div class="import-box"><div class="import-icon">✓</div><div><h3>还没有错题</h3><p>先完成几道词汇题，答错的题会自动留在这里。</p></div></div>';
  list.querySelectorAll('button').forEach(b=>b.onclick=()=>{current=questions.findIndex(q=>q.id===b.dataset.id);switchView('practice')});
}
function renderBank(){
  const verified=questions.filter(q=>q.verification?.status==='verified').length,flagged=questions.filter(q=>q.verification?.flags?.length).length;
  $('#bankView').innerHTML=`<div class="section-heading"><div><p class="eyebrow">A / B / C 核对结果</p><h2>题库管理</h2></div><span class="count-badge">${verified} / ${questions.length} 已核对</span></div><div class="import-box"><div class="import-icon">✓</div><div><h3>${esc(dataset?.dataset||'词汇题库')}</h3><p>真题抽取、解析抽取、原图复核三路证据均保存在题目数据中。当前异常题：${flagged}。</p></div><pre>${esc(JSON.stringify({status:dataset?.status,flags:dataset?.flags,questions:questions.length,verified,flagged},null,2))}</pre></div>`;
}
function switchView(view){document.querySelectorAll('.view').forEach(v=>v.classList.add('hidden'));$('#'+view+'View').classList.remove('hidden');document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===view));if(view==='mistakes')renderMistakes();if(view==='bank')renderBank()}
async function loadMode(nextMode){
  mode=nextMode;const config=modeConfig[mode];current=0;answered=0;correct=0;locked=false;
  document.querySelectorAll('.mode-tab').forEach(button=>button.classList.toggle('active',button.dataset.mode===mode));
  $('#sectionCrumb').textContent=mode==='listening'?`N1 / 听力 / ${listeningYear.replace('-','年')}月`:config.crumb;$('#sectionTitle').textContent=config.title;
  try{const path=mode==='listening'?`./data/listening-${listeningYear}.json`:config.path;const response=await fetch(path,{cache:'no-store'});if(!response.ok)throw new Error(`HTTP ${response.status}`);dataset=await response.json();const verifiedQuestions=dataset.questions.filter(q=>q.verification?.status==='verified'&&belongsToMode(q,mode));questions=(mode==='cloze'||mode==='mediumReading'||mode==='longReading'||mode==='listening')?verifiedQuestions:shuffle(verifiedQuestions);mistakes=JSON.parse(localStorage.getItem(mistakeKey())||'[]').filter(item=>questions.some(q=>q.id===item.id));localStorage.setItem(mistakeKey(),JSON.stringify(mistakes));switchView('practice');render()}
  catch(error){questions=[];mistakes=[];$('#questionPanel').innerHTML=`<div class="load-error"><strong>${esc(config.title)}题库尚未就绪</strong><p>${esc(error.message)}。数据生成完成后刷新或重新点击该板块。</p></div>`}
}
async function init(){
  const legacy=localStorage.getItem('n1-mistakes');if(legacy&&!localStorage.getItem('n1-vocabulary-mistakes'))localStorage.setItem('n1-vocabulary-mistakes',legacy);
  document.querySelectorAll('.nav-item').forEach(b=>b.onclick=()=>switchView(b.dataset.view));
  document.querySelectorAll('.mode-tab').forEach(b=>b.onclick=()=>loadMode(b.dataset.mode));
  $('#resetBtn').onclick=()=>{if(!['cloze','mediumReading','longReading','listening'].includes(mode))questions=shuffle(questions);current=0;answered=0;correct=0;render()};
  await loadMode('vocabulary');
}
init();
