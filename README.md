# Tsumori

Tsumori 是一个面向中文用户的日语学习工具，围绕每日积累、间隔复习、AI 辅助理解、分级阅读和口语练习组织学习内容。

## 当前状态

项目目前支持服务端账号注册登录和两种学习数据存储模式，适合个人使用和小范围体验，正式公开前仍需补齐生产环境安全与运维能力。

- 所有账号统一登记到服务端数据库
- 密码使用服务端 `scrypt` 加盐哈希保存，不存储明文
- 本地模式：学习数据保存在当前浏览器的 `localStorage`
- 云端模式：学习数据同步到服务端，可在其他设备登录后恢复
- 注册必须阅读并同意隐私政策与使用条款
- 用户可在设置中切换本地模式与云端模式
- AI API Key 保存在当前浏览器，并由本地 Node 服务转发请求
- 支持中文、英文、日文、韩文、越南文和缅甸文界面
- 本地模式清除浏览器数据会导致学习记录丢失，请定期导出备份

## 本地运行

要求：Node.js 18 或更高版本。

Linux / macOS / WSL 一键启动（无需安装 npm 依赖）：

```sh
./start.sh
```

脚本会自动切换到项目目录并检查 Node.js 版本。按 `Ctrl+C` 停止服务。
也可通过环境变量指定端口，例如 `PORT=8080 ./start.sh`。

Windows PowerShell：

```powershell
.\server.ps1
```

然后访问：

```text
http://127.0.0.1:5173/
```

也可以直接运行：

```powershell
node server.js
```

默认监听 `0.0.0.0:5173`，可通过 `HOST` 和 `PORT` 环境变量调整。

## 文档

- [用户使用说明](docs/USER_GUIDE.md)
- [隐私政策与使用条款](docs/PRIVACY_POLICY.md)
- [服务器部署说明](docs/DEPLOYMENT.md)
- [不使用 Docker 的简易部署](docs/SIMPLE_DEPLOY.md)
- [公开发布前规划](docs/PUBLIC_RELEASE_PLAN.md)

## 主要功能

- 每日打卡、成果汇总、昨日重点和历史学习明细
- 单词收藏与 SM-2 间隔复习
- 短句收藏
- AI 日语理解、翻译、例句与语法说明
- 按学习等级和行业生成分级阅读
- 日语朗读和浏览器语音识别练习
- 学习配置、AI 服务商设置、数据导入导出

## 技术结构

- 原生 JavaScript、HTML、CSS
- Node.js HTTP 服务
- 服务端持久化账号库与会话
- 浏览器 `localStorage` 本地缓存
- Gemini、OpenAI、DeepSeek API
- Web Speech API
