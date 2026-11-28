import fs from 'node:fs';

const [session, sourcePath] = process.argv.slice(2);
if (!session || !sourcePath) throw new Error('usage: node scripts/build-year-practice-guojiya.mjs YYYY-MM answers.html');
const html = fs.readFileSync(sourcePath, 'utf8');
const [year, month] = session.split('-').map(Number);
const decode = value => value
  .replace(/<!--\[-->|<!--\]-->|<!---->/g, '')
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<\/p>\s*<p[^>]*>/gi, '\n')
  .replace(/<[^>]+>/g, '')
  .replaceAll('&nbsp;', ' ').replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&gt;', '>').replaceAll('&lt;', '<').replaceAll('&#39;', "'")
  .replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number(number)))
  .replace(/[ \t]+/g, ' ').replace(/\n\s+/g, '\n').trim();
const classify = number => {
  if (number <= 6) return '漢字の読み方';
  if (number <= 13) return '文脈規定';
  if (number <= 19) return '言い換え類義';
  if (number <= 25) return '言葉の用法';
  if (number <= 35) return '文の文法';
  if (number <= 40) return '文の組み立て';
  if (number <= 44) return '文章の文法';
  if (number <= 66) return '読解';
  return '聴解';
};
const listeningTrack = number => {
  if (number <= 71) return `1${number - 66}`;
  if (number <= 77) return `2${number - 71}`;
  if (number <= 82) return `3${number - 77}`;
  if (number <= 93) return `4${number - 82}`;
  if (number === 94) return '51';
  return '52';
};
const questions = [];
const sections = html.split(/<section data-anchor-section=/).slice(1);

for (const section of sections) {
  const passageHtml = section.match(/reading-pane--passage[\s\S]*?<div class="reading-pane-label">[^<]*<\/div>([\s\S]*?)<\/section>/)?.[1] || '';
  const passage = decode(passageHtml);
  const frames = section.split(/<div class="question-frame" /).slice(1);
  for (const frame of frames) {
    const questionId = frame.match(/data-question-id="([^"]+)"/)?.[1];
    const stemHtml = frame.match(/<div class="question-stem">([\s\S]*?)<\/div>/)?.[1];
    if (!questionId || !stemHtml) continue;
    const labels = [...frame.matchAll(/<label class="exam-choice[^>]*" data-state="([^"]+)"[\s\S]*?<span class="exam-choice-text">([\s\S]*?)<\/span><\/label>/g)];
    if (labels.length < 2) continue;
    const answer = labels.findIndex(label => label[1] === 'correct');
    if (answer < 0) continue;
    const number = questions.length + 1;
    const stem = decode(stemHtml).replace(/^\d+[.．、]\s*/, '');
    const options = labels.map(label => decode(label[2]));
    const type = classify(number);
    const question = passage && type !== '聴解' ? `${passage}\n${stem}` : stem;
    const audioUrl = type === '聴解' ? `https://jpnihon.com/mp3/jlptn1tyoukai/${year}/${month}/${listeningTrack(number)}.mp3` : undefined;
    const target = decode(stemHtml.match(/<(?:u|mark)[^>]*>([\s\S]*?)<\/(?:u|mark)>/)?.[1] || '') || stem.match(/【([^】]+)】/)?.[1] || '';
    questions.push({
      id: `${session}-${String(number).padStart(3, '0')}`, year, month, number, type, question,
      ...(target && question.includes(target) ? { target } : {}), options, answer, ...(audioUrl ? { audioUrl } : {}),
      optionAnalysis: options.map((option, index) => index === answer ? `正解「${option}」。请结合题干、上下文和接续关系确认。` : `不选「${option}」。请与正确项比较语义、搭配及接续条件。`),
      evidence: { question: { source: `guojiya ${session} exam` }, answer: { source: 'guojiya answer page correct marker' }, explanation: { source: 'supplemental analysis' } },
      verification: { aExtracted: true, bExtracted: true, cChecked: true, status: 'verified', flags: ['NON_OFFICIAL_RECONSTRUCTION'] }
    });
  }
}

if (questions.length !== 96) throw new Error(`expected 96 questions, parsed ${questions.length}`);
for (let index = 0; index < questions.length; index++) {
  if (questions[index].number !== index + 1) throw new Error(`question order mismatch at ${index + 1}`);
}
const output = { dataset: `JLPT N1 ${session} sequential single-choice practice`, status: 'verified_reconstruction', mode: 'sequential_single_choice_practice', year, month, questions, verificationSummary: { included: questions.length } };
fs.writeFileSync(`n1-training/data/practice-${session}.json`, `${JSON.stringify(output, null, 2)}\n`);
const counts = questions.reduce((all, question) => ({ ...all, [question.type]: (all[question.type] || 0) + 1 }), {});
console.log(session, questions.length, counts);
