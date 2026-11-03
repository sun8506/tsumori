const path = require('path');
const { createWorker } = require('tesseract.js');

(async () => {
  const worker = await createWorker('jpn', 1, {
    langPath: path.resolve(__dirname, '../node_modules/@tesseract.js-data/jpn/4.0.0_best_int'),
    cacheMethod: 'none'
  });
  console.log('SERVER_OCR_READY');
  await worker.terminate();
})().catch(error => {
  console.error(error);
  process.exit(1);
});
