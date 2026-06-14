/**
 * News source and graded-reading generator.
 *
 * NHK headlines are used as source topics. The active AI provider creates an
 * original learner-facing passage at the current user's JLPT level.
 */

const NHK = {
  INDUSTRIES: {
    none: {
      label: '通用',
      topics: ['社会与生活', '地理与地方', '自然现象', '科学技术', '文化历史'],
      sources: [
        { name: 'NHK', section: '社会・科学・文化', url: 'https://www3.nhk.or.jp/news/' },
        { name: '気象庁', section: '天气与自然现象', url: 'https://www.jma.go.jp/jma/kishou/know/' },
        { name: '国土地理院', section: '地图与地理', url: 'https://www.gsi.go.jp/' }
      ]
    },
    it: {
      label: 'IT / 科技',
      topics: ['网络安全', 'AI 与软件', '数字化', '科技产业'],
      sources: [
        { name: 'IPA', section: '安全・数字人才', url: 'https://www.ipa.go.jp/' },
        { name: '経済産業省', section: 'IT 政策・数字化', url: 'https://www.meti.go.jp/press/' },
        { name: 'JETRO', section: '科技与海外市场', url: 'https://www.jetro.go.jp/biznews/' }
      ]
    },
    sales: {
      label: '销售 / 商务',
      topics: ['消费趋势', '市场营销', '电商', '海外商务'],
      sources: [
        { name: 'JETRO', section: '商务新闻・市场', url: 'https://www.jetro.go.jp/biznews/' },
        { name: '経済産業省', section: '商业・流通', url: 'https://www.meti.go.jp/press/' },
        { name: '消費者庁', section: '消费者与市场', url: 'https://www.caa.go.jp/notice/' }
      ]
    },
    realestate: {
      label: '房地产 / 城市',
      topics: ['城市规划', '住宅', '土地与地图', '防灾'],
      sources: [
        { name: '国土交通省', section: '住宅・土地・城市', url: 'https://www.mlit.go.jp/report/press/' },
        { name: '国土地理院', section: '地图・地形', url: 'https://www.gsi.go.jp/' },
        { name: '気象庁', section: '地震・防灾', url: 'https://www.jma.go.jp/jma/kishou/know/' }
      ]
    },
    hospitality: {
      label: '酒店 / 旅游',
      topics: ['访日旅游', '地方观光', '交通', '文化体验'],
      sources: [
        { name: 'JNTO', section: '访日旅游・地方资讯', url: 'https://www.jnto.go.jp/news/' },
        { name: '観光庁', section: '旅游政策・统计', url: 'https://www.mlit.go.jp/kankocho/' },
        { name: '国土交通省', section: '交通・地域', url: 'https://www.mlit.go.jp/report/press/' }
      ]
    },
    food: {
      label: '食品 / 餐饮',
      topics: ['农业与食材', '食品安全', '饮食文化', '食品出口'],
      sources: [
        { name: '農林水産省', section: '食品・农业・饮食文化', url: 'https://www.maff.go.jp/j/press/' },
        { name: '消費者庁', section: '食品标示・安全', url: 'https://www.caa.go.jp/notice/' },
        { name: 'JETRO', section: '日本食品・出口', url: 'https://www.jetro.go.jp/biznews/' }
      ]
    },
    service: {
      label: '服务业',
      topics: ['服务创新', '劳动与人才', '消费体验', '数字服务'],
      sources: [
        { name: '経済産業省', section: '服务产业・流通', url: 'https://www.meti.go.jp/press/' },
        { name: '厚生労働省', section: '劳动・人才', url: 'https://www.mhlw.go.jp/stf/houdou/' },
        { name: 'JETRO', section: '服务市场', url: 'https://www.jetro.go.jp/biznews/' }
      ]
    },
    education: {
      label: '教育',
      topics: ['学校教育', '语言学习', '教育科技', '文化与学习'],
      sources: [
        { name: '文部科学省', section: '教育政策・学校', url: 'https://www.mext.go.jp/b_menu/houdou/index.htm' },
        { name: '文化庁', section: '日语・文化', url: 'https://www.bunka.go.jp/koho_hodo_oshirase/hodohappyo/' },
        { name: 'NHK', section: '教育・文化', url: 'https://www3.nhk.or.jp/news/' }
      ]
    },
    manufacturing: {
      label: '制造业',
      topics: ['制造技术', '供应链', '机器人', '节能与材料'],
      sources: [
        { name: '経済産業省', section: '制造业・产业政策', url: 'https://www.meti.go.jp/press/' },
        { name: 'JETRO', section: '机械・供应链', url: 'https://www.jetro.go.jp/biznews/' },
        { name: 'NEDO', section: '技术开发・能源', url: 'https://www.nedo.go.jp/news/press/' }
      ]
    }
  },

  TARGETS: {
    n5: { characters: '900-1200', grammar: 'N5', vocabulary: 'very common daily vocabulary' },
    n4: { characters: '1100-1400', grammar: 'N4', vocabulary: 'common daily vocabulary' },
    n3: { characters: '1400-1800', grammar: 'N3', vocabulary: 'common news and daily vocabulary' },
    n2: { characters: '1800-2200', grammar: 'N2', vocabulary: 'natural news vocabulary with brief context' },
    n1: { characters: '2200-2600', grammar: 'N1', vocabulary: 'natural adult news vocabulary' },
    free: { characters: '1600-2000', grammar: 'natural Japanese', vocabulary: 'natural Japanese vocabulary' }
  },

  getIndustryPlan(industry) {
    return this.INDUSTRIES[industry] || this.INDUSTRIES.none;
  },

  async fetchCandidates(profile = {}) {
    const industry = profile.industry || 'none';
    const response = await fetch(`/api/news?industry=${encodeURIComponent(industry)}`, { cache: 'no-store' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `News request failed: ${response.status}`);
    return Array.isArray(data.articles) ? data.articles : [];
  },

  async generateArticle(source, profile) {
    const level = profile.level || 'n3';
    const target = this.TARGETS[level] || this.TARGETS.n3;
    const baseSystemPrompt = [
      'You create original Japanese graded reading material for language learners.',
      'Use the supplied headline only as a topic and do not copy a source article.',
      'Do not invent precise names, numbers, quotations, or claims that are not supplied.',
      'Return only a valid json object.',
      'Write each paragraph as one compact string.',
      'Add furigana immediately after each kanji word using this format: 日本(にほん).',
      'Do not annotate kana, punctuation, numbers, or Latin text.'
    ].join('\n');

    const context = [
      `Source headline: ${source.title}`,
      `Source category: ${source.category || source.section || 'general'}`,
      `Industry focus: ${this.getIndustryPlan(profile.industry).label}`,
      `Source date: ${source.date || ''}`,
      `Target level: ${target.grammar}`,
      `Target length: ${target.characters} Japanese characters, approximately 15 minutes for a learner.`,
      `Vocabulary policy: ${target.vocabulary}.`
    ].join('\n');

    const metadata = await this.generateJsonWithRetry(
      [
        baseSystemPrompt,
        'Create metadata and vocabulary only. Do not write the article body.',
        'Use this exact shape:',
        '{"title":"","summary":"","topic":"","level":"","estimatedMinutes":15,"vocabulary":[{"word":"","reading":"","meaningZh":""}]}'
      ].join('\n'),
      [
        context,
        'Create a concise title and summary for an AI-adapted learning passage.',
        'Provide 8-12 important vocabulary items with Chinese meanings.',
        'Return one compact json object only.'
      ].join('\n'),
      3072
    );

    const firstHalf = await this.generateArticlePart({
      baseSystemPrompt,
      context,
      title: metadata.title || source.title,
      summary: metadata.summary || '',
      part: 1
    });
    const secondHalf = await this.generateArticlePart({
      baseSystemPrompt,
      context,
      title: metadata.title || source.title,
      summary: metadata.summary || '',
      part: 2,
      previousEnding: firstHalf[firstHalf.length - 1] || ''
    });

    return {
      sourceId: source.id || '',
      sourceTitle: source.title,
      sourceUrl: source.url || '',
      sourceDate: source.date || '',
      sourceName: source.sourceName || '',
      industry: profile.industry || 'none',
      title: metadata.title || source.title,
      summary: metadata.summary || '',
      topic: metadata.topic || 'news',
      level,
      estimatedMinutes: Number(metadata.estimatedMinutes || 15),
      paragraphs: this.normalizeParagraphs([...firstHalf, ...secondHalf]),
      vocab: Array.isArray(metadata.vocabulary) ? metadata.vocabulary : [],
      generatedAt: new Date().toISOString(),
      date: source.date || new Date().toISOString(),
      kind: 'graded-news'
    };
  },

  async generateArticlePart({ baseSystemPrompt, context, title, summary, part, previousEnding = '' }) {
    const isFirst = part === 1;
    const systemPrompt = [
      baseSystemPrompt,
      `Write ${isFirst ? 'the first half' : 'the second half'} of the article body.`,
      'Use this exact shape:',
      '{"paragraphs":["日本(にほん)の文章(ぶんしょう)。"]}'
    ].join('\n');
    const prompt = [
      context,
      `Article title: ${title}`,
      `Article summary: ${summary}`,
      isFirst
        ? 'Write 4 coherent opening and explanatory paragraphs, about half of the total target length.'
        : 'Write 4 coherent continuation and concluding paragraphs, about half of the total target length.',
      previousEnding ? `Continue naturally after this previous paragraph: ${previousEnding}` : '',
      'Do not repeat earlier paragraphs.',
      'Return one complete compact json object only.'
    ].filter(Boolean).join('\n');

    const result = await this.generateJsonWithRetry(systemPrompt, prompt, 5120);
    if (!Array.isArray(result.paragraphs) || result.paragraphs.length === 0) {
      throw new Error('AI returned no article paragraphs.');
    }
    return result.paragraphs.filter(paragraph => typeof paragraph === 'string' && paragraph.trim());
  },

  async generateJsonWithRetry(systemPrompt, prompt, maxOutputTokens) {
    try {
      return await AIProvider.generateJson(systemPrompt, prompt, maxOutputTokens);
    } catch (error) {
      if (!/json|incomplete|malformed/i.test(error.message)) throw error;
      return AIProvider.generateJson(
        systemPrompt,
        `${prompt}\nThe previous response was invalid. Return one complete compact json object only.`,
        maxOutputTokens
      );
    }
  },

  normalizeParagraphs(paragraphs) {
    if (!Array.isArray(paragraphs)) return [];
    return paragraphs.map(paragraph => {
      if (typeof paragraph === 'string') {
        return { segments: this.parseAnnotatedText(paragraph) };
      }
      if (Array.isArray(paragraph?.segments)) {
        return {
          segments: paragraph.segments
            .filter(segment => segment && typeof segment.text === 'string')
            .map(segment => ({
              text: segment.text,
              reading: typeof segment.reading === 'string' ? segment.reading : ''
            }))
        };
      }
      return { segments: [] };
    }).filter(paragraph => paragraph.segments.length > 0);
  },

  parseAnnotatedText(text) {
    const segments = [];
    const pattern = /([一-龯々〆ヶ]+)\(([^()\n]+)\)/g;
    let cursor = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (match.index > cursor) {
        segments.push({ text: text.slice(cursor, match.index), reading: '' });
      }
      segments.push({ text: match[1], reading: match[2] });
      cursor = pattern.lastIndex;
    }
    if (cursor < text.length) {
      segments.push({ text: text.slice(cursor), reading: '' });
    }
    return segments.filter(segment => segment.text);
  },

  async generateSelected(sources, profile, onProgress) {
    if (!AIProvider.isConfigured()) {
      throw new Error('请先在设置中配置并启用一个 AI 服务。');
    }
    const selected = Array.isArray(sources) ? sources.slice(0, 3) : [];
    if (!selected.length) throw new Error('请至少选择一个阅读主题。');
    const generated = [];
    for (let index = 0; index < selected.length; index += 1) {
      if (onProgress) onProgress(index + 1, selected.length, selected[index]);
      generated.push(await this.generateArticle(selected[index], profile));
    }
    return generated;
  }
};

window.NHK = NHK;
