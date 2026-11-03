/**
 * Unified AI provider adapter.
 *
 * API keys are stored in localStorage because Tsumori is currently a
 * local-only static app. For a hosted deployment, move provider requests to a
 * backend so keys are never exposed to browser code.
 */

const AIProvider = {
  PROVIDERS: {
    gemini: {
      label: 'Gemini',
      models: [
        { value: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash' },
        { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
        { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite' }
      ]
    },
    openai: {
      label: 'ChatGPT / OpenAI',
      models: [
        { value: 'gpt-5.5', label: 'GPT-5.5' },
        { value: 'gpt-5.4-mini', label: 'GPT-5.4 mini' },
        { value: 'gpt-5-mini', label: 'GPT-5 mini' }
      ]
    },
    deepseek: {
      label: 'DeepSeek',
      models: [
        { value: 'deepseek-v4-flash', label: 'DeepSeek V4 Flash' },
        { value: 'deepseek-v4-pro', label: 'DeepSeek V4 Pro' }
      ]
    }
  },

  getConfig() {
    const config = Storage.getConfig();
    const provider = config.ai?.activeProvider || 'gemini';
    const providerConfig = config.ai?.providers?.[provider] || {};
    return {
      provider,
      label: this.PROVIDERS[provider]?.label || provider,
      apiKey: providerConfig.apiKey || '',
      model: providerConfig.model || ''
    };
  },

  isConfigured() {
    const config = this.getConfig();
    return Boolean(config.provider && config.apiKey && config.model);
  },

  async analyzeWord(query, userConfig = {}) {
    const config = this.getConfig();
    if (!config.apiKey) {
      throw new Error(`${config.label} API key is not configured`);
    }
    if (!config.model) {
      throw new Error(`${config.label} model is not selected`);
    }

    const maxExamples = Number(userConfig.maxExamples || 3);
    const sourceLanguage = userConfig.sourceLanguage || 'ja';
    const targetLanguage = userConfig.targetLanguage || (userConfig.language === 'en' ? 'en' : 'zh');
    const languageNames = { ja: 'Japanese', zh: 'Simplified Chinese', en: 'English' };
    const explanationLanguage = targetLanguage === 'ja'
      ? (userConfig.language === 'en' ? 'English' : 'Simplified Chinese')
      : languageNames[targetLanguage];
    const systemPrompt = [
      'You are a bidirectional Japanese translation and learning assistant.',
      'One side of every translation is Japanese. The other side is English or Simplified Chinese.',
      'The input may be a word, phrase, sentence, or short passage.',
      'Return only a valid json object. Do not wrap it in markdown.',
      'The json object shape must be:',
      '{"inputType":"word|expression|sentence","word":"","reading":"","pos":[],"translation":"","translationJa":"","translationZh":"","translationEn":"","meaningJp":"","meaningZh":"","meaningEn":"","alternatives":[],"breakdown":[{"text":"","reading":"","meaning":""}],"examples":[{"jp":"","reading":"","zh":"","en":""}],"grammarNotes":"","nuance":"","levelNote":"","audioHint":""}'
    ].join('\n');
    const prompt = [
      `Translate this input: ${query}`,
      `Source language: ${languageNames[sourceLanguage] || sourceLanguage}`,
      `Target language: ${languageNames[targetLanguage] || targetLanguage}`,
      `Explanation language: ${explanationLanguage}`,
      `Learner language: ${userConfig.language || 'zh'}`,
      `JLPT level: ${userConfig.level || 'n3'}`,
      `Industry context: ${userConfig.industry || 'none'}`,
      'Translation style: natural, accurate, and idiomatic in the target language.',
      `Maximum examples: ${maxExamples}`,
      'Put the complete target-language translation in translation.',
      'Set inputType to word for a standalone vocabulary item, expression for a reusable short phrase, or sentence for a complete sentence or passage.',
      'Also copy it into translationJa, translationZh, or translationEn according to the target language.',
      'If the source is not Japanese, analyze the translated Japanese output.',
      'word must contain the key Japanese word or Japanese translation.',
      'reading must be the Japanese reading in hiragana when useful.',
      'Provide 0-3 useful alternative translations.',
      'Break down important Japanese vocabulary and grammar chunks, not every character.',
      'Each breakdown text field must contain a standalone Japanese word or useful Japanese grammar chunk that can be saved for study.',
      `Write breakdown meanings, grammar notes, nuance, and example translations in ${explanationLanguage}.`,
      'Adapt explanations and Japanese examples to the learner level and industry context.',
      'Return the answer as a valid json object only.'
    ].join('\n');

    const result = await this.generateJson(systemPrompt, prompt, 2048);
    result.examples = Array.isArray(result.examples) ? result.examples.slice(0, maxExamples) : [];
    result.pos = Array.isArray(result.pos) ? result.pos : [];
    result.alternatives = Array.isArray(result.alternatives) ? result.alternatives.slice(0, 3) : [];
    result.breakdown = Array.isArray(result.breakdown) ? result.breakdown.slice(0, 12) : [];
    return result;
  },

  async analyzeN1Article(text, questions = []) {
    const config = this.getConfig();
    if (!config.apiKey) throw new Error(`${config.label} API key is not configured`);
    const prompt = `Analyze this advanced Japanese reading passage. Return valid JSON only.
Schema: {"title":"","summaryZh":"","paragraphs":[{"text":"","translationZh":"","keyPoints":"","sentences":[{"text":"","translationZh":"","grammar":[{"point":"","meaningZh":"","note":""}],"vocabulary":[{"word":"","reading":"","meaningZh":"","pos":"","example":""}],"mistakes":""}]}],"questions":[{"question":"","choices":[{"label":"1","text":""}],"answer":"","reasonZh":"","trap":""}],"overallNotes":""}
title must be a concise natural Japanese title written only in Japanese. Preserve original Japanese exactly; split into clickable sentences; explain every sentence with Chinese translation, key grammar, vocabulary, common mistakes and examples. For every reading question, preserve the complete question and all numbered choices in choices, put only the correct choice label such as "2" in answer, and explain why it is correct and why the distractors are wrong. Do not omit content.
PASSAGE:\n${text}\nQUESTIONS:\n${questions.join('\n')}`;
    return this.generateJson(
      'You are an expert Japanese reading teacher. Be precise and pedagogical. Return JSON only.',
      prompt,
      20000
    );
  },

  async generateJson(systemPrompt, prompt, maxOutputTokens = 2048) {
    const config = this.getConfig();
    if (!config.apiKey) throw new Error(`${config.label} API key is not configured`);
    const text = await this.requestLocal(config, prompt, systemPrompt, maxOutputTokens);
    return this.parseJson(text);
  },

  async requestLocal(config, prompt, systemPrompt, maxOutputTokens = 2048) {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${Auth.token()}`
      },
      body: JSON.stringify({
        provider: config.provider,
        apiKey: config.apiKey,
        model: config.model,
        prompt,
        systemPrompt,
        maxOutputTokens
      })
    });
    let data = null;
    try {
      data = await response.json();
    } catch {
      // The status below will produce a useful fallback error.
    }
    if (!response.ok) {
      throw new Error(data?.error || `Local AI request failed: HTTP ${response.status}`);
    }
    return data?.text || '';
  },

  parseJson(text) {
    if (!text) throw new Error('AI返回了空内容，请重新解析。');
    const cleaned = String(text)
      .replace(/^\uFEFF/, '')
      .replace(/```(?:json)?/gi, '')
      .replace(/```/g, '')
      .trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start < 0 || end < start) {
      throw new Error('AI输出未完成，可能达到了长度上限。请缩短文章或分批解析。');
    }
    const rawJson = cleaned.slice(start, end + 1);
    const candidates = [
      rawJson,
      rawJson.replace(/,\s*([}\]])/g, '$1'),
      this.escapeJsonStringControls(rawJson).replace(/,\s*([}\]])/g, '$1')
    ];
    for (const candidate of [...new Set(candidates)]) {
      try { return JSON.parse(candidate); } catch {}
    }
    throw new Error('AI返回的JSON格式异常。原文和OCR草稿仍已保留，请重新解析。');
  },

  escapeJsonStringControls(value) {
    let output = '';
    let inString = false;
    let escaped = false;
    for (const character of String(value)) {
      if (escaped) {
        output += character;
        escaped = false;
        continue;
      }
      if (character === '\\' && inString) {
        output += character;
        escaped = true;
        continue;
      }
      if (character === '"') {
        inString = !inString;
        output += character;
        continue;
      }
      if (inString && character === '\n') output += '\\n';
      else if (inString && character === '\r') output += '\\r';
      else if (inString && character === '\t') output += '\\t';
      else output += character;
    }
    return output;
  }
};

window.AIProvider = AIProvider;
