# Tsumori — 专业日语专家系统设计

> 版本: 1.0.0
> 日期: 2026-06-12
> 状态: 待实现

---

## 1. 概述

在 Tsumori 日语学习应用中增加"专业日语专家"功能。用户输入日语单词、短语或句子，系统通过 AI 模型提供结构化解析（释义、例句、语法说明等），并可一键加入单词库参与 SM-2 间隔复习。

### 1.1 核心价值

- **场景化学习**：根据用户行业、水平定制例句和难度
- **多语言释义**：支持中文/英文/双语释义
- **学习闭环**：查询 → 解析 → 入库 → 复习，一体化流程

---

## 2. 用户画像（Profile）

每个用户在初始化时需要填写以下信息，影响 AI 解析输出。

### 2.1 数据结构

```typescript
interface UserProfile {
  language: LanguageCode;    // 释义首选语种
  industry: IndustryCode;    // 行业背景
  level: LevelCode;          // 日语水平
  tags: string[];            // 自定义标签（可选）
}

interface UserSettings {
  autoAddToVocab: boolean;   // 查询后自动加入单词库
  showExamples: boolean;     // 是否显示例句
  showGrammar: boolean;      // 是否显示语法说明
  maxExamples: number;       // 最多展示例句数量 (1-5)
}
```

### 2.2 释义语种选项

| 代码 | 显示 | 说明 |
|------|------|------|
| `zh` | 中文 | 仅中文释义 |
| `en` | 英文 | 仅英文释义 |
| `zh-en` | 中英双语 | 中文 + 英文都有 |
| `ja-zh` | 日中双语 | 日文释义 + 中文 |

### 2.3 行业选项

| 代码 | 显示名称 |
|------|----------|
| `it` | IT・技術 |
| `sales` | 営業 |
| `realestate` | 不動産 |
| `hospitality` | ホテル・宿泊 |
| `food` | 飲食 |
| `service` | サービス |
| `education` | 教育 |
| `manufacturing` | 製造 |
| `none` | 未設定（通用场景） |

### 2.4 日语水平选项

| 代码 | 显示 |
|------|------|
| `n5` | N5（入门） |
| `n4` | N4（初级） |
| `n3` | N3（中级） |
| `n2` | N2（中高级） |
| `n1` | N1（高级） |
| `free` | 自由（不设限） |

### 2.5 数据位置

用户画像存储在 `_config` 的 `users[]` 数组中，每个用户对象追加字段：

```json
{
  "id": "user_xxx",
  "name": "张三",
  "profile": {
    "language": "zh",
    "industry": "it",
    "level": "n3",
    "tags": []
  },
  "settings": {
    "autoAddToVocab": false,
    "showExamples": true,
    "showGrammar": true,
    "maxExamples": 3
  }
}
```

---

## 3. 数据模型

### 3.1 专家查询记录 (expert_queries)

存储用户每次查询的完整记录，独立于 vocabulary 表。

```typescript
interface ExpertQuery {
  id: string;                              // 主键
  query: string;                           // 用户原始输入
  userId: string;                          // 查询者ID
  profileSnapshot: ProfileSnapshot;        // 查询时用户画像快照
  result: ExpertResult;                    // AI 返回的完整解析
  linkedWordId: string | null;             // 关联的单词库ID（如果已加入）
  addedToVocab: boolean;                   // 是否已加入单词库
  createdAt: string;                       // ISO 时间戳
  reviewedCount: number;                   // 查看/复习次数
}

interface ProfileSnapshot {
  industry: string;
  level: string;
  language: string;
}

interface ExpertResult {
  word: string;                            // 标准化词条
  reading: string;                         // 读音（ふりがな）
  pos: string[];                           // 词性列表
  meaningJp: string;                       // 日文释义
  meaningZh: string | null;                // 中文释义
  meaningEn: string | null;                // 英文释义
  examples: Example[];                     // 例句数组
  grammarNotes: string | null;             // 语法说明
  nuance: string | null;                   // 语感/使用场景
  audioHint: string | null;                // 发音提示（罗马音）
}

interface Example {
  jp: string;                              // 日语例句
  reading: string;                         // 读音
  zh: string | null;                       // 中文翻译
  en: string | null;                       // 英文翻译
}
```

### 3.2 Vocabulary 扩展

现有 vocabulary 表增加字段标记来源：

```json
{
  "word": "お疲れ様です",
  "reading": "おつかれさまです",
  "meaningJp": "...",
  "meaningZh": "...",
  "source": "expert",                  // 新增: "manual" | "expert" | "import"
  "expertQueryId": "eq_xxx",           // 新增: 关联查询ID
  "industry": "it",                    // 新增: 查询时的行业快照
  "level": "n3",                       // 新增: 查询时的水平快照
  "tags": [],
  ...  // 其他字段保持不变
}
```

---

## 4. AI 交互设计

### 4.1 系统提示词模板

```
あなたは熟練の日本語教師兼通訳専門家です。

【ユーザー情報】
- 母国語/希望解説言語: {language}
- 業界: {industry_display}
- 日本語レベル: {level_display}

【指示】
1. {query} について解説してください
2. 例文はユーザーの業界に関連するものが好ましい
3. 解説言語は {language_display} で
4. レベルに合わせた難易度で

【出力形式】
JSON形式で必ず返してください。フィールドは以下:
{
  "word": "标准化词条",
  "reading": "读音",
  "pos": ["品詞1", "品詞2"],
  "meaningJp": "日文释义",
  "meaningZh": "中文释义(null nếu không chọn)",
  "meaningEn": "英文释义(null nếu không chọn)",
  "examples": [
    {"jp": "...", "reading": "...", "zh": "...", "en": "..."}
  ],
  "grammarNotes": "语法说明或null",
  "nuance": "语感说明或null",
  "audioHint": "罗马音提示或null"
}

注意: examples最多返回{maxExamples}个。行业相关的例句优先。
```

### 4.2 API 调用

使用已有的 `Gemini` 类（`js/api.js`），新增方法：

```javascript
Gemini.analyzeWord(query, userConfig)
```

- `query`: 用户输入的字符串
- `userConfig`: 包含 language, industry, level, maxExamples 的配置对象
- 返回: `ExpertResult` 对象（解析后的 JSON）

---

## 5. 页面设计

### 5.1 导航入口

在底部导航栏新增"专家"按钮，图标 `sparkles`。

底部导航顺序：
```
ホーム → 単語帳 → 語句庫 → 🧠 专家 → ニュース → 話す → 設定
```

### 5.2 Expert View 页面

```
┌─────────────────────────────────┐
│  🧠 专业日语专家                │
│  输入词・短语・句子查询          │
├─────────────────────────────────┤
│  [____________________] [🔍]    │  ← 搜索栏
├─────────────────────────────────┤
│                                 │
│  ┌─ 查询历史 ────────────────┐  │
│  │ 📋 11/02 14:30 お疲れ様    │  │  ← 可点击展开
│  │ 📋 10/28 09:15 見積もり    │  │
│  │ 📋 10/25 16:00 接続詞      │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌─ 最近解析结果 ────────────┐  │
│  │ [▼ 展开查看]              │  │  ← 最近一次查询
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

### 5.3 解析结果卡片（展开/模态）

```
┌─────────────────────────────────┐
│  📋 "お疲れ様です"               │
├─────────────────────────────────┤
│ 📖 読み方: おつかれさまです      │
│ 🏷️  品詞: 慣用句・挨拶          │
│ 📊 レベル: N3                  │
│ 🏢 業界: IT・技術              │
│                                 │
│ ── 释义 ──                      │
│ 🇯🇵 日本語:                     │
│   労をねぎらう挨拶表現。         │
│                                 │
│ 🇨🇳 中文:                       │
│   辛苦了。用于感谢对方的付出     │
│                                 │
│ 🇺🇸 English:                    │  ← 选双语时显示
│   Thank you for your hard work. │
│                                 │
│ ── 行业相关例句 ──               │
│ 1. [IT] 今晚的会议...           │
│    読み: kon'ya no kai...       │
│                                 │
│ 2.                              │
│                                 │
│ ── 语法说明 ──                   │
│ ～お疲れ様です は职场中最常用... │
│                                 │
│ ── 语感提示 ──                   │
│ ビジネスシーンで最も安全な...    │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ 📚 加入单词库        👁 只看 │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ 🗑 删除此条查询记录          │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

---

## 6. 交互逻辑

### 6.1 查询流程

```
用户输入 → 点击查询/回车
    ↓
读取当前用户 profile
    ↓
构建 AI Prompt（注入行业/水平/语言偏好）
    ↓
调用 Gemini API
    ↓
解析 JSON 响应
    ↓
保存到 expert_queries 表
    ↓
展示解析结果
    ↓
如果 autoAddToVocab = true → 自动加入单词库
```

### 6.2 加入单词库流程

```
用户点击"加入单词库"按钮
    ↓
检查是否已加入（linkedWordId 是否为 null）
    ↓
创建 vocabulary 条目:
  - word = result.word
  - reading = result.reading
  - meaningJp/meaningZh = result.meaning
  - source = "expert"
  - expertQueryId = current query id
  - industry/level = profile snapshot
  - SM2 初始化
    ↓
更新 expert_query 的 linkedWordId 和 addedToVocab
    ↓
提示"已加入" + 显示习得进度
```

### 6.3 历史记录管理

- 每次查询生成一条 `expert_query` 记录
- 点击历史条目 → 展开/重新加载该条解析结果
- 可删除单条记录（不影响已加入单词库的内容）
- 可一键清空全部历史

---

## 7. 文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `index.html` | 修改 | 底部导航新增"专家"按钮 |
| `js/components/nav.js` | 修改 | 新增专家视图的导航绑定 |
| `js/views/expert.js` | **新建** | 专家视图主逻辑 |
| `js/api.js` | 修改 | 新增 `Gemini.analyzeWord()` |
| `js/storage.js` | 修改 | 新增 expert_queries CRUD 方法 |
| `js/views/settings.js` | 修改 | 新增用户画像编辑、专家设置 |
| `css/components.css` | 修改 | 新增专家视图样式 |

---

## 8. SM-2 集成

- 从专家查询加入单词库 → 标准 SM-2 初始化
- 复习时显示来源标记 `"expert"` 和行业标签
- 复习卡片可显示关联的原始查询和例句

---

## 9. 优先级

1. **P0** — 核心查询 + 解析展示 + 加入单词库
2. **P1** — 用户画像初始化 + AI Prompt 行业注入
3. **P2** — 查询历史 + 删除/清空
4. **P3** — 多语言释义切换 + 设置页

---

## 10. 注意事项

- AI 返回的 JSON 需要解析失败容错
- 查询需异步处理，展示"解析中"状态
- 行业选项后续可按需扩展（修改 prompt 即可）
- 查询历史按用户隔离
