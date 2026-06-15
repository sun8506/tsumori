const http = require('http');
const fs = require('fs');
const path = require('path');
const ServerDatabase = require('./server-db');

const root = __dirname;
const host = process.env.HOST || '0.0.0.0';
const port = Number(process.env.PORT || 5173);
const isProduction = process.env.NODE_ENV === 'production';
const trustProxy = process.env.TRUST_PROXY === 'true';
const database = new ServerDatabase(root);
const CLOUD_KEYS = new Set(['vocabulary', 'phrases', 'articles', 'expert_queries', 'learning_records']);
const authAttempts = new Map();
const AUTH_WINDOW_MS = 15 * 60 * 1000;
const AUTH_MAX_ATTEMPTS = Math.max(10, Number(process.env.AUTH_RATE_LIMIT_MAX || 60));

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function send(res, status, body, contentType = 'text/plain; charset=utf-8', cacheControl = 'no-store') {
  const payload = Buffer.isBuffer(body) ? body : Buffer.from(String(body));
  res.writeHead(status, {
    'Content-Type': contentType,
    'Content-Length': payload.length,
    'Cache-Control': cacheControl
  });
  res.end(payload);
}

function sendJson(res, status, value) {
  send(res, status, JSON.stringify(value), 'application/json; charset=utf-8');
}

function bearerToken(req) {
  const match = String(req.headers.authorization || '').match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : '';
}

function authenticatedUser(req) {
  return database.getUserByToken(bearerToken(req));
}

function clientIp(req) {
  if (trustProxy) {
    const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    if (forwarded) return forwarded;
  }
  return req.socket.remoteAddress || 'unknown';
}

function allowAuthAttempt(req) {
  const key = clientIp(req);
  const now = Date.now();
  const previous = authAttempts.get(key);
  const entry = !previous || previous.resetAt <= now
    ? { count: 0, resetAt: now + AUTH_WINDOW_MS }
    : previous;
  entry.count += 1;
  authAttempts.set(key, entry);
  return {
    allowed: entry.count <= AUTH_MAX_ATTEMPTS,
    retryAfter: Math.max(1, Math.ceil((entry.resetAt - now) / 1000))
  };
}

setInterval(() => {
  const now = Date.now();
  authAttempts.forEach((entry, key) => {
    if (entry.resetAt <= now) authAttempts.delete(key);
  });
}, AUTH_WINDOW_MS).unref();

function applySecurityHeaders(res) {
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "base-uri 'self'",
    "connect-src 'self'",
    "font-src 'self' https://fonts.gstatic.com",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "img-src 'self' data:",
    "object-src 'none'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com"
  ].join('; '));
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'camera=(), geolocation=(), payment=()');
}

function sanitizeCollections(value) {
  const collections = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return collections;
  CLOUD_KEYS.forEach(key => {
    if (Array.isArray(value[key])) collections[key] = value[key];
  });
  return collections;
}

function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return '/';
  }
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > 5 * 1024 * 1024) {
        reject(new Error('Request body is too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch {
        reject(new Error('Invalid JSON request body'));
      }
    });
    req.on('error', reject);
  });
}

async function readUpstream(response, providerName) {
  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  if (!response.ok) {
    const detail = data?.error?.message || data?.message || `HTTP ${response.status}`;
    if (response.status === 429 && /quota|billing|plan/i.test(detail)) {
      throw new Error(`${providerName} quota is unavailable. Check the API account billing and usage limits, or select another provider in Settings.`);
    }
    if (response.status === 401) {
      throw new Error(`${providerName} API key is invalid or unauthorized.`);
    }
    throw new Error(`${providerName} request failed: ${detail}`);
  }
  return data || {};
}

async function requestAI({ provider, apiKey, model, prompt, systemPrompt, maxOutputTokens = 2048 }) {
  if (!apiKey || !model || !prompt) throw new Error('Incomplete AI request configuration');
  const outputLimit = Math.min(Math.max(Number(maxOutputTokens) || 2048, 512), 8192);

  if (provider === 'gemini') {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: outputLimit,
            responseMimeType: 'application/json'
          }
        })
      }
    );
    const data = await readUpstream(response, 'Gemini');
    return data?.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('') || '';
  }

  if (provider === 'openai') {
    const jsonPrompt = `${prompt}\nReturn the answer as a valid json object only.`;
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        instructions: systemPrompt,
        input: jsonPrompt,
        max_output_tokens: outputLimit,
        text: { format: { type: 'json_object' } }
      })
    });
    const data = await readUpstream(response, 'OpenAI');
    if (data.output_text) return data.output_text;
    return (data.output || [])
      .flatMap(item => item.content || [])
      .filter(item => item.type === 'output_text')
      .map(item => item.text || '')
      .join('');
  }

  if (provider === 'deepseek') {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        thinking: { type: 'disabled' },
        response_format: { type: 'json_object' },
        max_tokens: outputLimit,
        temperature: 0.4
      })
    });
    const data = await readUpstream(response, 'DeepSeek');
    return data?.choices?.[0]?.message?.content || '';
  }

  throw new Error(`Unsupported AI provider: ${provider}`);
}

function decodeXml(value) {
  return String(value || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

const evergreenTopics = {
  none: [
    ['日本の地形と火山が暮らしに与える影響', '国土地理院', '地理', 'https://www.gsi.go.jp/'],
    ['季節によって天気が変わる仕組み', '気象庁', '自然现象', 'https://www.jma.go.jp/jma/kishou/know/'],
    ['地域の祭りが受け継がれる理由', '文化庁', '文化', 'https://www.bunka.go.jp/']
  ],
  it: [
    ['身近なサービスを守るサイバーセキュリティ', 'IPA', '网络安全', 'https://www.ipa.go.jp/security/'],
    ['生成AIが仕事の進め方を変える理由', '経済産業省', 'AI', 'https://www.meti.go.jp/'],
    ['日本企業のデジタル化と人材育成', 'IPA', '数字化', 'https://www.ipa.go.jp/jinzai/']
  ],
  sales: [
    ['日本の消費者が商品を選ぶポイント', '消費者庁', '消费趋势', 'https://www.caa.go.jp/'],
    ['越境ECで日本の商品を海外へ届ける', 'JETRO', '电商', 'https://www.jetro.go.jp/'],
    ['地域ブランドを伝えるマーケティング', '経済産業省', '营销', 'https://www.meti.go.jp/']
  ],
  realestate: [
    ['人口の変化とこれからのまちづくり', '国土交通省', '城市规划', 'https://www.mlit.go.jp/'],
    ['地図から分かる土地の特徴と災害リスク', '国土地理院', '防灾', 'https://www.gsi.go.jp/'],
    ['日本の住宅にある季節への工夫', '国土交通省', '住宅', 'https://www.mlit.go.jp/']
  ],
  hospitality: [
    ['地方の文化を生かした観光の作り方', 'JNTO', '地方观光', 'https://www.jnto.go.jp/'],
    ['訪日旅行者が求める日本での体験', '観光庁', '访日旅游', 'https://www.mlit.go.jp/kankocho/'],
    ['観光地を支える交通と案内の工夫', '国土交通省', '交通', 'https://www.mlit.go.jp/']
  ],
  food: [
    ['日本の季節と旬の食材', '農林水産省', '饮食文化', 'https://www.maff.go.jp/'],
    ['食品表示から安全な商品を選ぶ', '消費者庁', '食品安全', 'https://www.caa.go.jp/'],
    ['日本の食品が海外で人気になる理由', 'JETRO', '食品出口', 'https://www.jetro.go.jp/']
  ],
  service: [
    ['人に選ばれるサービスの共通点', '経済産業省', '服务创新', 'https://www.meti.go.jp/'],
    ['働く人を支える職場のコミュニケーション', '厚生労働省', '人才', 'https://www.mhlw.go.jp/'],
    ['デジタル技術で変わる接客サービス', '経済産業省', '数字服务', 'https://www.meti.go.jp/']
  ],
  education: [
    ['一人ひとりに合わせた学びとは何か', '文部科学省', '学校教育', 'https://www.mext.go.jp/'],
    ['デジタル教材が教室を変える', '文部科学省', '教育科技', 'https://www.mext.go.jp/'],
    ['日本語を学ぶ人が増えている理由', '文化庁', '语言学习', 'https://www.bunka.go.jp/']
  ],
  manufacturing: [
    ['日本のものづくりを支える小さな工場', '経済産業省', '制造技术', 'https://www.meti.go.jp/'],
    ['ロボットと人が一緒に働く工場', 'NEDO', '机器人', 'https://www.nedo.go.jp/'],
    ['供給網を強くするための企業の工夫', 'JETRO', '供应链', 'https://www.jetro.go.jp/']
  ]
};

const industrySearchTerms = {
  it: 'IT OR AI OR サイバーセキュリティ OR デジタル',
  sales: 'マーケティング OR 消費動向 OR EC OR 小売',
  realestate: '不動産 OR 住宅 OR まちづくり OR 都市計画',
  hospitality: '観光 OR ホテル OR 訪日旅行 OR 地方旅行',
  food: '食品 OR 農業 OR 食品安全 OR 食文化',
  service: 'サービス業 OR 接客 OR 人材 OR デジタルサービス',
  education: '教育 OR 学校 OR 日本語学習 OR デジタル教材',
  manufacturing: '製造業 OR ものづくり OR ロボット OR サプライチェーン'
};

function buildEvergreenCandidates(industry) {
  const topics = evergreenTopics[industry] || evergreenTopics.none;
  return topics.map((item, index) => ({
    id: `evergreen_${industry}_${index}`,
    title: item[0],
    sourceName: item[1],
    category: item[2],
    date: new Date().toISOString(),
    url: item[3],
    evergreen: true
  }));
}

async function fetchNewsCandidates(industry = 'none') {
  const evergreen = buildEvergreenCandidates(industry);
  if (industry === 'none') try {
    const response = await fetch('https://www3.nhk.or.jp/news/easy/news-list.json', {
      headers: { 'User-Agent': 'Tsumori/1.0' }
    });
    if (response.ok) {
      const data = await response.json();
      const group = Array.isArray(data) ? data[0] : null;
      const dates = group ? Object.keys(group).sort().reverse() : [];
      const articles = dates.flatMap(date => group[date] || []).slice(0, 8).map(item => ({
        id: item.news_id,
        title: item.title || 'NHK Easy News',
        sourceName: 'NHK',
        category: industry === 'none' ? '时事' : '行业时事',
        date: item.news_prearranged_time || date,
        url: item.news_web_url || item.news_web_easy_url || ''
      }));
      if (articles.length) return [...evergreen, ...articles].slice(0, 8);
    }
  } catch {
    // Fall through to RSS.
  }

  const feeds = industry === 'none'
    ? [
        'https://www.nhk.or.jp/rss/news/cat0.xml',
        'https://news.google.com/rss?hl=ja&gl=JP&ceid=JP:ja'
      ]
    : [
        `https://news.google.com/rss/search?q=${encodeURIComponent(industrySearchTerms[industry])}&hl=ja&gl=JP&ceid=JP:ja`
      ];
  for (const feed of feeds) {
    try {
      const response = await fetch(feed, { headers: { 'User-Agent': 'Tsumori/1.0' } });
      if (!response.ok) continue;
      const xml = await response.text();
      const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 8).map((match, index) => {
        const item = match[1];
        const title = decodeXml(item.match(/<title>([\s\S]*?)<\/title>/)?.[1]);
        const url = decodeXml(item.match(/<link>([\s\S]*?)<\/link>/)?.[1]);
        const date = decodeXml(item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]);
        const source = decodeXml(item.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1]);
        return {
          id: `rss_${Date.now()}_${index}`,
          title,
          sourceName: source || (feed.includes('nhk.or.jp') ? 'NHK' : 'Google News'),
          category: industry === 'none' ? '时事' : '行业动态',
          date: date || new Date().toISOString(),
          url
        };
      }).filter(item =>
        item.title &&
        !/中古|販売|セットアップ|メンズ|サイズ|送料無料|オークション|通販/.test(item.title)
      );
      if (items.length) return [...evergreen, ...items].slice(0, 8);
    } catch {
      // Try the next feed.
    }
  }

  return evergreen;
}

const server = http.createServer(async (req, res) => {
  try {
    applySecurityHeaders(res);
    const requestUrl = new URL(req.url || '/', `http://127.0.0.1:${port}`);
    const pathname = safeDecode(requestUrl.pathname);

    if (pathname === '/healthz') {
      if (req.method !== 'GET') return sendJson(res, 405, { error: 'METHOD_NOT_ALLOWED' });
      return sendJson(res, 200, {
        status: 'ok',
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString()
      });
    }

    if (pathname === '/api/auth/register') {
      if (req.method !== 'POST') return sendJson(res, 405, { error: 'METHOD_NOT_ALLOWED' });
      const attempt = allowAuthAttempt(req);
      if (!attempt.allowed) {
        res.setHeader('Retry-After', String(attempt.retryAfter));
        return sendJson(res, 429, { error: 'TOO_MANY_ATTEMPTS' });
      }
      try {
        const body = await readJson(req);
        const email = String(body.email || '').trim().toLowerCase();
        const password = String(body.password || '');
        if (!String(body.name || '').trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return sendJson(res, 400, { error: 'INVALID_REGISTRATION' });
        }
        if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
          return sendJson(res, 400, { error: 'INVALID_PASSWORD' });
        }
        if (!body.privacyConsent || !body.privacyVersion) {
          return sendJson(res, 400, { error: 'CONSENT_REQUIRED' });
        }
        const user = database.createUser({
          name: body.name,
          email,
          password,
          storageMode: body.storageMode,
          uiLanguage: body.uiLanguage,
          privacyVersion: body.privacyVersion
        });
        const session = database.createSession(user.id);
        return sendJson(res, 201, { user, ...session });
      } catch (error) {
        return sendJson(res, error.status || 400, { error: error.message });
      }
    }

    if (pathname === '/api/auth/login') {
      if (req.method !== 'POST') return sendJson(res, 405, { error: 'METHOD_NOT_ALLOWED' });
      const attempt = allowAuthAttempt(req);
      if (!attempt.allowed) {
        res.setHeader('Retry-After', String(attempt.retryAfter));
        return sendJson(res, 429, { error: 'TOO_MANY_ATTEMPTS' });
      }
      try {
        const body = await readJson(req);
        const user = database.authenticate(body.email, body.password);
        if (!user) return sendJson(res, 401, { error: 'INVALID_CREDENTIALS' });
        const session = database.createSession(user.id);
        return sendJson(res, 200, { user, ...session });
      } catch (error) {
        return sendJson(res, 400, { error: error.message });
      }
    }

    if (pathname === '/api/auth/me') {
      if (req.method !== 'GET') return sendJson(res, 405, { error: 'METHOD_NOT_ALLOWED' });
      const user = authenticatedUser(req);
      return user ? sendJson(res, 200, { user }) : sendJson(res, 401, { error: 'UNAUTHORIZED' });
    }

    if (pathname === '/api/auth/logout') {
      if (req.method !== 'POST') return sendJson(res, 405, { error: 'METHOD_NOT_ALLOWED' });
      database.deleteSession(bearerToken(req));
      return sendJson(res, 200, { ok: true });
    }

    if (pathname === '/api/account') {
      if (req.method !== 'PATCH') return sendJson(res, 405, { error: 'METHOD_NOT_ALLOWED' });
      const user = authenticatedUser(req);
      if (!user) return sendJson(res, 401, { error: 'UNAUTHORIZED' });
      try {
        const body = await readJson(req);
        const updated = database.updateUser(user.id, {
          name: body.name,
          uiLanguage: body.uiLanguage,
          storageMode: body.storageMode,
          profile: body.profile,
          settings: body.settings
        });
        return sendJson(res, 200, { user: updated });
      } catch (error) {
        return sendJson(res, 400, { error: error.message });
      }
    }

    if (pathname === '/api/data') {
      const user = authenticatedUser(req);
      if (!user) return sendJson(res, 401, { error: 'UNAUTHORIZED' });
      if (req.method === 'GET') {
        return sendJson(res, 200, { collections: database.getCloudData(user.id) });
      }
      if (req.method === 'PUT') {
        try {
          const body = await readJson(req);
          const collections = sanitizeCollections(body.collections);
          database.setCloudData(user.id, collections);
          return sendJson(res, 200, { collections, syncedAt: new Date().toISOString() });
        } catch (error) {
          return sendJson(res, 400, { error: error.message });
        }
      }
      return sendJson(res, 405, { error: 'METHOD_NOT_ALLOWED' });
    }

    if (pathname === '/api/ai') {
      if (req.method !== 'POST') {
        send(res, 405, JSON.stringify({ error: 'Method not allowed' }), 'application/json; charset=utf-8');
        return;
      }
      if (!authenticatedUser(req)) return sendJson(res, 401, { error: 'UNAUTHORIZED' });
      try {
        const text = await requestAI(await readJson(req));
        send(res, 200, JSON.stringify({ text }), 'application/json; charset=utf-8');
      } catch (error) {
        send(res, 502, JSON.stringify({ error: error.message }), 'application/json; charset=utf-8');
      }
      return;
    }

    if (pathname === '/api/news') {
      if (req.method !== 'GET') {
        send(res, 405, JSON.stringify({ error: 'Method not allowed' }), 'application/json; charset=utf-8');
        return;
      }
      if (!authenticatedUser(req)) return sendJson(res, 401, { error: 'UNAUTHORIZED' });
      try {
        const industry = String(requestUrl.searchParams.get('industry') || 'none').toLowerCase();
        const articles = await fetchNewsCandidates(evergreenTopics[industry] ? industry : 'none');
        send(res, 200, JSON.stringify({ articles }), 'application/json; charset=utf-8');
      } catch (error) {
        send(res, 502, JSON.stringify({ error: error.message }), 'application/json; charset=utf-8');
      }
      return;
    }

    const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const filePath = path.resolve(root, relativePath);
    const relativeToRoot = path.relative(root, filePath);

    if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
      send(res, 403, 'Forbidden');
      return;
    }

    fs.readFile(filePath, (error, data) => {
      if (error) {
        send(res, 404, 'Not found');
        return;
      }
      const extension = path.extname(filePath).toLowerCase();
      const cacheControl = isProduction && !['.html', '.json'].includes(extension)
        ? 'public, max-age=3600'
        : 'no-store';
      send(res, 200, data, mimeTypes[extension] || 'application/octet-stream', cacheControl);
    });
  } catch (error) {
    send(res, 500, 'Internal server error');
  }
});

server.on('error', error => {
  console.error(error.message);
});

server.on('clientError', (_error, socket) => {
  if (socket.writable) {
    socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');
  }
});

process.on('uncaughtException', error => {
  console.error(error);
});

process.on('unhandledRejection', error => {
  console.error(error);
});

server.listen(port, host, () => {
  console.log(`Tsumori server listening on ${host}:${port} (${isProduction ? 'production' : 'development'})`);
});

function shutdown(signal) {
  console.log(`${signal} received, shutting down`);
  server.close(error => {
    if (error) {
      console.error(error);
      process.exitCode = 1;
    }
  });
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
