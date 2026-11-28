import fs from 'node:fs';

const [session, languagePath, readingPath, listeningPath] = process.argv.slice(2);
if (!session || !languagePath || !readingPath || !listeningPath) {
  throw new Error('usage: node scripts/build-year-practice-lws.mjs YYYY-MM language.html reading.html listening.html');
}

const [year, month] = session.split('-').map(Number);
const read = path => fs.readFileSync(path, 'utf8');
const sourceUrl = `https://learnwithsubs.uk/en/jlpt/n1/${session}/`;
const answerSets = {
  '2025-07': {
    source: 'https://sjds.net/606795.html',
    groups: ['224143', '1323124', '344231', '241314', '2143414123', '23214', '4312', '3434', '32424123', '421', '44', '413', '33', '12423', '433414', '14314', '31311233122', '232']
  },
  '2025-12': {
    source: 'https://www.scribd.com/document/1060454299/2025年12月-N1-详细答案',
    groups: ['144232', '2323144', '131221', '334422', '3241343142', '34211', '4123', '3124', '31313431', '432', '32', '241', '24', '13321', '134412', '14143', '22131312332', '312'],
    unverifiedNumbers: [93]
  }
};
const answerSet = answerSets[session];
if (!answerSet) throw new Error(`no independent answer set configured for ${session}`);
const answerSource = answerSet.source;
const officialAnswers = answerSet.groups.join('').split('').map(value => Number(value) - 1);
const unverifiedNumbers = new Set(answerSet.unverifiedNumbers || []);

const entities = { nbsp: ' ', amp: '&', quot: '"', gt: '>', lt: '<', apos: "'", '#39': "'" };
const decode = value => (value || '')
  .replace(/<rt\b[^>]*>[\s\S]*?<\/rt>/gi, '')
  .replace(/<(?:br|hr)\b[^>]*>/gi, '\n')
  .replace(/<\/(?:p|div|li|tr|h\d)>/gi, '\n')
  .replace(/<[^>]+>/g, '')
  .replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (_, entity) => {
    if (entity[0] === '#') return String.fromCodePoint(Number.parseInt(entity.slice(entity[1]?.toLowerCase() === 'x' ? 2 : 1), entity[1]?.toLowerCase() === 'x' ? 16 : 10));
    return entities[entity] ?? `&${entity};`;
  })
  .replace(/[ \t]+/g, ' ')
  .replace(/ *\n */g, '\n')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

const articles = html => [...html.matchAll(/<article class="xq"[\s\S]*?<\/article>/g)].map(match => match[0]);
const first = (html, pattern) => html.match(pattern)?.[1] || '';
const classText = (html, className) => decode(first(html, new RegExp(`<[^>]+class="[^"]*\\b${className}\\b[^"]*"[^>]*>([\\s\\S]*?)<\\/[^>]+>`)));
const classify = number => number <= 6 ? '漢字の読み方' : number <= 13 ? '文脈規定' : number <= 19 ? '言い換え類義' : number <= 25 ? '言葉の用法' : number <= 35 ? '文の文法' : number <= 40 ? '文の組み立て' : number <= 44 ? '文章の文法' : number <= 66 ? '読解' : '聴解';
const rowAnalyses = html => {
  const analyses = [];
  for (const row of html.matchAll(/<div class="row[^"\n]*"[^>]*>[\s\S]*?<span class="n">(\d+)<\/span><div class="body">([\s\S]*?)<\/div><\/div>/g)) analyses[Number(row[1]) - 1] = decode(row[2]);
  return analyses;
};
const listeningTranscript = html => [...html.matchAll(/<div class="script-line">([\s\S]*?)<\/div>\s*<\/div>/g)]
  .map(match => {
    const speaker = classText(match[1], 'who');
    const japanese = decode(first(match[1], /<span class="jp masked">([\s\S]*?)<\/span>\s*<span class="cn2/));
    return japanese ? `${speaker ? `${speaker}：` : ''}${japanese}` : '';
  }).filter(Boolean).join('\n');
const makeAnalyses = (options, answer, supplied = []) => options.map((option, index) => supplied[index] || (index === answer ? `正解「${option}」。符合题干的语义、搭配或上下文条件。` : `不选「${option}」。与正确项相比，语义、搭配、接续或上下文条件不符。`));
const extractLis = html => [...html.matchAll(/<li\b([^>]*)>[\s\S]*?<span class="(?:otx|txt)">([\s\S]*?)<\/span>[\s\S]*?<\/li>/g)].map(match => ({ attrs: match[1], text: decode(match[2]) }));

const questions = [];
const add = ({ question, options, answer, target, audioUrl, transcript, analyses }) => {
  const number = questions.length + 1;
  if (!question || options.length < 2 || answer < 0) throw new Error(`incomplete question ${number}`);
  questions.push({
    id: `${session}-${String(number).padStart(3, '0')}`, year, month, number, type: classify(number), question,
    ...(target ? { target } : {}), options, answer, ...(audioUrl ? { audioUrl } : {}), ...(transcript ? { transcript } : {}),
    optionAnalysis: makeAnalyses(options, answer, analyses),
    evidence: {
      question: { source: `${sourceUrl}${number <= 44 ? '' : number <= 66 ? 'reading' : 'listening'}` },
      answer: { source: `${answerSource} cross-checked against page correct marker` },
      explanation: { source: 'LearnWithSubs option analysis; fallback analysis added where absent' }
    },
    verification: { aExtracted: true, bExtracted: true, cChecked: true, status: 'verified', flags: ['NON_OFFICIAL_RECONSTRUCTION', 'NATIVE_HTML_SOURCE'] }
  });
};

for (const article of articles(read(languagePath))) {
  const id = first(article, /<article[^>]+id="([^"]+)"/);
  if (id.startsWith('v')) {
    const sentenceHtml = first(article, /<div class="sentence">([\s\S]*?)<\/div>/);
    const optionArea = article.split('<details class="xq-an">')[0];
    const opts = optionArea.split(/(?=<div class="opt tappable")/).slice(1).map(chunk => ({
      correct: first(chunk, /data-correct="([01])"/),
      text: classText(chunk, 'txt'),
      gloss: classText(chunk, 'gloss')
    }));
    const target = classText(sentenceHtml, 'hl') || classText(article, 'w');
    const question = decode(sentenceHtml) || `「${target}」の使い方として最もよいものを選んでください。`;
    add({ question, target, options: opts.map(item => item.text), answer: opts.findIndex(item => item.correct === '1'), analyses: opts.map(item => item.gloss) });
  } else if (id === 'g41') {
    const passage = [...article.matchAll(/<div class="pjp">([\s\S]*?)<\/div>/g)].map(item => decode(item[1])).filter(Boolean).join('\n');
    for (const block of article.matchAll(/<div class="qblock"[\s\S]*?(?=<div class="qblock"|<\/article>)/g)) {
      const qhtml = block[0];
      const stem = classText(qhtml, 'qhead').replace(/^\d+\s*/, '');
      const opts = qhtml.split(/(?=<div class="qopt")/).slice(1, 5).map(chunk => ({ correct: /data-correct="1"/.test(chunk), text: classText(chunk, 'otext') }));
      add({ question: `${passage}\n\n${stem}`, options: opts.map(item => item.text), answer: opts.findIndex(item => item.correct), analyses: rowAnalyses(qhtml) });
    }
  } else {
    let stemHtml = first(article, /<div class="qtext">([\s\S]*?)<\/div>/);
    if (/^g(?:36|37|38|39|40)$/.test(id)) {
      stemHtml = stemHtml.replace(/<span class="slot([^"]*)">[\s\S]*?<\/span>/g, (_, classes) => classes.includes('star') ? ' ★ ' : ' ＿＿ ');
    }
    const list = first(article, /<ul class="opts">([\s\S]*?)<\/ul>/);
    const opts = extractLis(list);
    add({ question: decode(stemHtml), options: opts.map(item => item.text), answer: opts.findIndex(item => /data-correct="1"/.test(item.attrs)), analyses: rowAnalyses(article) });
  }
}
const languageCount = questions.length;

for (const article of articles(read(readingPath))) {
  const pane = first(article, /<div class="pane pane-jp">([\s\S]*?)(?=<div class="pane pane-(?:cn|en)|<div class="q">)/);
  const passage = decode(pane);
  const chunks = article.split(/(?=<div class="q">)/).slice(1);
  for (const chunk of chunks) {
    const stem = decode(first(chunk, /<div class="q">([\s\S]*?)<\/div>/)).replace(/^問\d*\s*/, '');
    const group = first(chunk, /<div class="optgrp"[^>]*>([\s\S]*?)<\/div>/);
    const opts = extractLis(group);
    if (!opts.length) continue;
    const answer = Number(first(chunk, /<div class="optgrp"[^>]*data-answer="(\d+)"/)) - 1;
    add({ question: `${passage}\n\n${stem}`, options: opts.map(item => item.text), answer, analyses: rowAnalyses(chunk) });
  }
}
const readingCount = questions.length - languageCount;

for (const article of articles(read(listeningPath))) {
  const audioUrl = first(article, /<audio controls src="([^"]+\.mp3)"/);
  const transcript = listeningTranscript(article);
  const beforeAnswer = article.split('<details class="xq-an">')[0];
  const groups = [...beforeAnswer.matchAll(/<ul class="options[^"]*">([\s\S]*?)<\/ul>/g)];
  for (const group of groups) {
    const list = group[1];
    const opts = [...list.matchAll(/<li\b([^>]*)>([\s\S]*?)<\/li>/g)].map(item => ({
      attrs: item[1],
      text: classText(item[2], 'otx') || classText(item[2], 'otxt') || classText(item[2], 'num')
    }));
    const prefix = beforeAnswer.slice(0, group.index);
    const stems = [...prefix.matchAll(/<p class="q-text">([\s\S]*?)<\/p>/g)];
    const visibleStem = decode(stems.at(-1)?.[1] || '') || `听录音后，选择最合适的答案。`;
    add({ question: visibleStem, options: opts.map(item => item.text), answer: opts.findIndex(item => /data-correct="1"/.test(item.attrs)), audioUrl, transcript });
  }
}
const listeningCount = questions.length - languageCount - readingCount;

if (questions.length !== 96) throw new Error(`expected 96 questions, parsed ${questions.length} (language ${languageCount}, reading ${readingCount}, listening ${listeningCount})`);
if (officialAnswers.length !== 96) throw new Error(`expected 96 reference answers, got ${officialAnswers.length}`);
const answerMismatches = [];
for (const question of questions) {
  if (unverifiedNumbers.has(question.number)) {
    answerMismatches.push({ number: question.number, pageAnswer: question.answer + 1, referenceAnswer: null, reason: 'third source omitted this answer' });
    question.verification.status = 'source_incomplete';
    question.verification.flags.push('SECONDARY_ANSWER_MISSING');
  } else if (question.answer !== officialAnswers[question.number - 1]) {
    answerMismatches.push({ number: question.number, pageAnswer: question.answer + 1, referenceAnswer: officialAnswers[question.number - 1] + 1 });
    question.verification.status = 'source_conflict';
    question.verification.flags.push('SECONDARY_ANSWER_CONFLICT');
  }
  if (question.number <= 66 && question.options.length !== 4) throw new Error(`unexpected written option count at question ${question.number}: ${question.options.length}`);
}

const output = {
  dataset: `JLPT N1 ${session} sequential single-choice practice`, status: 'verified_reconstruction', mode: 'sequential_single_choice_practice', year, month, questions,
  verificationSummary: { included: questions.length, nativeHtmlSource: questions.length, answerCrossChecked: questions.length - answerMismatches.length, answerMismatches, listeningAudio: questions.filter(question => question.audioUrl).length }
};
fs.writeFileSync(`n1-training/data/practice-${session}.json`, `${JSON.stringify(output, null, 2)}\n`);
const counts = questions.reduce((all, question) => ({ ...all, [question.type]: (all[question.type] || 0) + 1 }), {});
console.log(session, questions.length, counts, output.verificationSummary);
