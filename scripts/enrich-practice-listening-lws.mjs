import fs from 'node:fs';

const [datasetPath, listeningHtmlPath] = process.argv.slice(2);
if (!datasetPath || !listeningHtmlPath) throw new Error('usage: node scripts/enrich-practice-listening-lws.mjs dataset.json listening.html');

const decode = value => (value || '')
  .replace(/<rt\b[^>]*>[\s\S]*?<\/rt>/gi, '')
  .replace(/<(?:br|hr)\b[^>]*>/gi, '\n')
  .replace(/<[^>]+>/g, '')
  .replaceAll('&nbsp;', ' ').replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&gt;', '>').replaceAll('&lt;', '<').replaceAll('&#39;', "'")
  .replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number(number)))
  .replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').trim();
const classText = (html, className) => decode(html.match(new RegExp(`<[^>]+class="[^"]*\\b${className}\\b[^"]*"[^>]*>([\\s\\S]*?)<\\/[^>]+>`))?.[1] || '');
const articles = [...fs.readFileSync(listeningHtmlPath, 'utf8').matchAll(/<article class="xq"[\s\S]*?<\/article>/g)].map(match => match[0]);
const transcripts = [];

for (const article of articles) {
  const beforeAnswer = article.split('<details class="xq-an">')[0];
  const questionCount = (beforeAnswer.match(/data-correct="1"/g) || []).length;
  const lines = [...article.matchAll(/<div class="script-line">([\s\S]*?)<\/div>\s*<\/div>/g)].map(match => {
    const speaker = classText(match[1], 'who');
    const japanese = decode(match[1].match(/<span class="jp masked">([\s\S]*?)<\/span>\s*<span class="cn2/)?.[1] || '');
    return japanese ? `${speaker ? `${speaker}：` : ''}${japanese}` : '';
  }).filter(Boolean).join('\n');
  for (let index = 0; index < questionCount; index += 1) transcripts.push(lines);
}

const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));
const listeningQuestions = dataset.questions.filter(question => question.audioUrl);
if (listeningQuestions.length !== transcripts.length) throw new Error(`question/transcript mismatch: ${listeningQuestions.length}/${transcripts.length}`);
listeningQuestions.forEach((question, index) => { question.transcript = transcripts[index]; });
fs.writeFileSync(datasetPath, `${JSON.stringify(dataset, null, 2)}\n`);
console.log(`enriched ${listeningQuestions.length} listening questions in ${datasetPath}`);
