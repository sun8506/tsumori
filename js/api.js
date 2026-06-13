/**
 * Gemini AI API Wrapper
 * Google Gemini API through translation and explanation requests.
 * API key is stored in Storage.
 */

const Gemini = {
  API_URL: 'https://generativelanguage.googleapis.com/v1beta/',

  async initApiKey() {
    const config = JSON.parse(Storage.get('_config') || '{}');
    return config.apiKey || '';
  },

  async generate(prompt, systemPrompt) {
    const apiKey = await this.initApiKey();
    if (!apiKey) {
      console.warn('API key not configured');
      return null;
    }

    const body = {
      contents: [{
        parts: [
          ...(systemPrompt ? [{ text: systemPrompt }] : []),
          { text: prompt }
        ].filter(Boolean)
      }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
    };

    try {
      const res = await fetch(`${this.API_URL}models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      return data;
    } catch (e) {
      console.error('Gemini generate error:', e);
      return null;
    }
  },

  /**
   * Analyze a word/phrase with AI
   * @param {string} query - User input word/phrase
   * @param {object} userConfig - { language, industry, level, maxExamples }
   * @returns {object|null} ExpertResult object
   */
  async analyzeWord(query, userConfig) {
    const apiKey = await this.initApiKey();
    if (!apiKey) {
      console.warn('API key not configured');
      return null;
    }

    const industryMap = {
      it: 'IT銉绘妧琛?,
      sales: '鍠舵キ',
      realestate: '涓嶅嫊鐢?,
      hospitality: '銉涖儐銉兓瀹挎硦',
      food: '椋查',
      service: '銈点兗銉撱偣',
      education: '鏁欒偛',
      manufacturing: '瑁介€?,
      none: '鏈ō瀹氾紙閫氱敤锛?
    };

    const levelMap = {
      n5: 'N5 (鍏ラ棬)',
      n4: 'N4 (鍒濈骇)',
      n3: 'N3 (涓骇)',
      n2: 'N2 (涓珮绾?',
      n1: 'N1 (楂樼骇)',
      free: '鑷敱锛堜笉璁鹃檺锛?
    };

    const langDisplay = {
      zh: '涓枃',
      en: 'English',
      'zh-en': '涓枃 + English',
      'ja-zh': '鏃ユ湰瑾?+ 涓枃'
    };

    const industry = industryMap[userConfig.industry] || '鏈ō瀹?;
    const level = levelMap[userConfig.level] || 'N3 (涓骇)';
    const lang = langDisplay[userConfig.language] || '涓枃';

    const systemPrompt = [
      '銇傘仾銇熴伅鐔熺反銇棩鏈獮鏁欏斧鍏奸€氳ǔ灏傞杸瀹躲仹銇欍€?,
      '',
      '銆愩儲銉笺偠銉兼儏鍫便€?,
      `- 甯屾湜瑙ｈ瑷€瑾? ${lang}`,
      `- 妤晫: ${industry}`,
      `- 鏃ユ湰瑾炪儸銉欍儷: ${level}`,
      '',
      '銆愭寚绀恒€?,
      '1. 浠ヤ笅銇偗銈ㄣ儶銇仱銇勩仸瑙ｈ銇椼仸銇忋仩銇曘亜',
      '   - 渚嬫枃銇儲銉笺偠銉笺伄妤晫銇枹閫ｃ仚銈嬨倐銇亴濂姐伨銇椼亜',
      `   - 瑙ｈ瑷€瑾炪伅 ${lang} 銇,
      '   - 銉儥銉伀鍚堛倧銇涖仧闆ｆ槗搴︺仹',
      '',
      '銆愬嚭鍔涘舰寮忋€?,
      'JSON褰㈠紡銇у繀銇氳繑銇椼仸銇忋仩銇曘亜銆傘儠銈ｃ兗銉儔銇互涓嬶細',
      '{',
      '  "word": "鏍囧噯鍖栬瘝鏉?,',
      '  "reading": "璇婚煶锛堛伈銈夈亴銇級",',
      '  "pos": ["鍚嶈", "銈靛鍕曡"],',
      '  "meaningJp": "鏃ユ湰瑾炪仹銇畾缇┿兓瑾槑",',
      '  "meaningZh": "涓枃閲婁箟锛堥伕鎶炪仐銇亜鍫村悎銇痭ull锛?,',
      '  "meaningEn": "English definition锛堥伕鎶炪仐銇亜鍫村悎銇痭ull锛?,',
      '  "examples": [',
      '    {"jp": "渚嬫枃1", "reading": "瑾伩1", "zh": "涓枃缈昏瘧", "en": "English translation"}',
      '  ],',
      '  "grammarNotes": "璇硶璇存槑锛堛仾銇勫牬鍚堛伅null锛?,',
      '  "nuance": "璇劅銉讳娇鐢ㄥ牬闈紙銇亜鍫村悎銇痭ull锛?,',
      '  "audioHint": "缃楅┈闊虫彁绀猴紙銇亜鍫村悎銇痭ull锛?',
      '}',
      '',
      '娉ㄦ剰锛?,
      `- examples鏈€澶氳繑鍥?${userConfig.maxExamples || 3} 涓猔,
      '- 琛屼笟鐩稿叧鐨勪緥鍙ヤ紭鍏?,
      '- 涓嶈杩斿洖涓嶇‘瀹氱殑淇℃伅',
      '- 缁濆鍙緭鍑篔SON锛屼笉瑕佽緭鍑哄叾浠栧唴瀹?,
      '- 涓嶈浣跨敤markdown浠ｇ爜鍧楋紙```json锛夊寘瑁?
    ].join('\n');

    const prompt = `銆愩偗銈ㄣ儶銆慭n${query}`;

    const body = {
      contents: [{
        parts: [
          { text: systemPrompt },
          { text: prompt }
        ]
      }],
      generationConfig: { temperature: 0.5, maxOutputTokens: 2048 }
    };

    try {
      const res = await fetch(`${this.API_URL}models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Parse JSON from response
      try {
        const jsonStart = text.indexOf('{');
        const jsonEnd = text.lastIndexOf('}');
        if (jsonStart >= 0 && jsonEnd > jsonStart) {
          const jsonStr = text.substring(jsonStart, jsonEnd + 1);
          const result = JSON.parse(jsonStr);
          // Ensure required fields
          if (!result.examples) result.examples = [];
          if (!result.pos) result.pos = [];
          return result;
        }
      } catch (parseErr) {
        console.warn('Failed to parse AI response as JSON:', parseErr);
      }
      return null;
    } catch (e) {
      console.error('Gemini analyzeWord error:', e);
      return null;
    }
  }
};

window.Gemini = Gemini;