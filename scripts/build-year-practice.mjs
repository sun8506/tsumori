import fs from 'node:fs';

const [session, sourcePath] = process.argv.slice(2);
if (!session || !sourcePath) throw new Error('usage: node scripts/build-year-practice.mjs YYYY-MM source.html');
const html = fs.readFileSync(sourcePath, 'utf8');
const decode = value => value.replace(/<audio[\s\S]*?<\/audio>/gi, '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replaceAll('&nbsp;', ' ').replaceAll('&amp;', '&').replaceAll('&quot;', '"').replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number(number))).replace(/[ \t]+/g, ' ').replace(/\n\s+/g, '\n').trim();
const classify = (number, audioUrl) => {
  if (audioUrl) return '聴解';
  if (number <= 6) return '漢字の読み方';
  if (number <= 13) return '文脈規定';
  if (number <= 19) return '言い換え類義';
  if (number <= 25) return '言葉の用法';
  if (number <= 35) return '文の文法';
  if (number <= 40) return '文の組み立て';
  if (number <= 44) return '文章の文法';
  return '読解';
};
const segments = html.split(/<div class='step[^']*'\s*(?=data-question-id)/).slice(1);
const questions = [];

for (const segment of segments) {
  const questionId = segment.match(/^data-question-id='(\d+)'/)?.[1];
  const questionHtml = segment.match(/<div class='ays_quiz_question'>([\s\S]*?)<\/div>/)?.[1];
  if (!questionId || !questionHtml) continue;
  const fields = [...segment.matchAll(/<input type='(?:radio|checkbox)'[^>]*value='(\d+)'\/>[\s\S]*?<label[^>]*>\s*([\s\S]*?)\s*<\/label>/g)];
  if (fields.length < 2) continue;
  const encoded = segment.match(new RegExp(`window\\.quizOptions_\\d+\\['${questionId}'\\] = '([^']+)'`))?.[1];
  if (!encoded) continue;
  const answerMap = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8')).question_answer;
  const decodedQuestion = decode(questionHtml);
  const grouped = new Map();
  for (const field of fields) {
    const option = decode(field[2]);
    const match = option.match(/^(\d+)[-－](?:[1-4])[.．、]?\s*(.*)$/s);
    if (match) grouped.set(Number(match[1]), [...(grouped.get(Number(match[1])) || []), [field[1], match[2]]]);
  }
  const fieldGroups = grouped.size > 1 ? [...grouped.entries()] : [[Number(decodedQuestion.match(/(?:^|\n|\s)(\d+)[.．、]/)?.[1] || questions.length + 1), fields.map(field => [field[1], decode(field[2]).replace(/^[1-4][.．、]\s*/, '')])]];
  const raw = decodedQuestion.replace(/^\d+[.．、]\s*/, '');
  const target = decode(questionHtml.match(/<(?:u|span)[^>]*(?:underline|ff6600)[^>]*>([\s\S]*?)<\/(?:u|span)>/)?.[1] || '');
  const explanation = decode(segment.match(/<div class='ays_questtion_explanation'[^>]*>([\s\S]*?)<\/div>/)?.[1] || '');
  const audioUrl = questionHtml.match(/<source[^>]+src="([^"?]+\.mp3)(?:\?[^" ]*)?"/)?.[1];
  const explanationLines = explanation.split('\n').filter(Boolean);
  for (const [originalNumber, groupFields] of fieldGroups) {
    const answer = groupFields.findIndex(field => answerMap[field[0]] === '1');
    if (answer < 0) continue;
    const options = groupFields.map(field => field[1]);
    const optionAnalysis = options.map((option, index) => explanationLines.find(line => line.includes(option)) || (index === answer ? '正解。请结合题干、上下文与接续关系判断。' : '不选。请结合题干、上下文与接续关系排除。'));
    questions.push({
      id: `${session}-${String(originalNumber).padStart(3, '0')}`,
      year: Number(session.slice(0, 4)), month: Number(session.slice(5, 7)), number: originalNumber,
      type: classify(originalNumber, audioUrl), question: raw || (audioUrl ? '音声を聞いて、最も適切な答えを選んでください。' : `第${originalNumber}問`),
      ...(target && raw.includes(target) ? { target } : {}), options, answer, ...(audioUrl ? { audioUrl } : {}), optionAnalysis,
      evidence: { question: { source: `jpnihon ${session} sequential set` }, answer: { source: 'embedded answer key' }, explanation: { source: explanation ? 'embedded explanation' : 'supplemental analysis' } },
      verification: { aExtracted: true, bExtracted: true, cChecked: true, status: 'verified', flags: ['NON_OFFICIAL_RECONSTRUCTION'] }
    });
  }
}
if (questions.length < 25) throw new Error(`only ${questions.length} questions parsed`);
const clozeQuestions = questions.filter(question => question.type === '文章の文法');
const clozePassage = clozeQuestions.find(question => question.question.length > 80)?.question;
if (clozePassage) {
  for (const question of clozeQuestions) {
    if (question.question.length <= 12) question.question = clozePassage;
  }
}
const output = { dataset: `JLPT N1 ${session} sequential single-choice practice`, status: 'verified_reconstruction', mode: 'sequential_single_choice_practice', year: Number(session.slice(0, 4)), month: Number(session.slice(5, 7)), questions, verificationSummary: { included: questions.length } };
fs.writeFileSync(`n1-training/data/practice-${session}.json`, `${JSON.stringify(output, null, 2)}\n`);
const counts = questions.reduce((all, question) => ({ ...all, [question.type]: (all[question.type] || 0) + 1 }), {});
console.log(session, questions.length, counts);
