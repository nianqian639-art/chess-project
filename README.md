# ♞ Chesstong（棋童）— 国际象棋智能学习平台

> **LLM 工程暑期作品集 · Student Portfolio**
>
> 让国际象棋更容易听懂，也更容易坚持。

[![Website](https://img.shields.io/badge/Website-chesstong.com-brightgreen)](https://chesstong.com)
[![License](https://img.shields.io/badge/License-MIT-blue)](LICENSE)
[![Node](https://img.shields.io/badge/Node-22%2B-339933)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6)](https://www.typescriptlang.org/)

---

## 📖 目录

1. [项目简介](#项目简介)
2. [LLM 工程亮点](#llm-工程亮点)
3. [系统架构](#系统架构)
4. [核心功能](#核心功能)
5. [技术栈](#技术栈)
6. [快速开始](#快速开始)
7. [作品集文件索引](#作品集文件索引)
8. [项目进展](#项目进展)
9. [社会效益](#社会效益)

---

## 项目简介

**Chesstong（棋童）** 是一套面向 4-10 岁国际象棋初学者的智能学习平台。我 6 岁开始学棋，深知初学者最大的障碍不是兴趣，而是**理解**和**坚持**。这个项目利用大语言模型（LLM）将专业的棋语解释成孩子能听懂的话，同时为家长和老师提供学习监督工具。

### 我为什么做这个项目

| 维度 | 痛点 | Chesstong 的解决方案 |
|------|------|---------------------|
| 🧒 **学生** | 术语难懂、做题只有对错、缺少反馈 | AI 用生活化语言讲解每一步，300+ 分级题库 + 即时反馈 |
| 👨‍👩‍👧 **家长** | 不懂棋，难以监督孩子学习 | 绑定孩子账号，查看学习周报，AI 生成个性化评语 |
| 👨‍🏫 **老师** | 课后管理困难，难以追踪练习情况 | 班级管理、作业布置、公告发布、学生进度追踪 |

**核心创新**：用大语言模型把"这是一个牵制，被牵制的子不能随便移动"变成"这个棋子后面保护着更重要的棋子，就像被钉在原地一样"——让孩子真正理解，而不只是背诵。

---

## LLM 工程亮点

本项目深入应用了 **8 个 LLM 工程核心维度**，详细分析见 [`LLM_ENGINEERING_NOTES.md`](./LLM_ENGINEERING_NOTES.md)：

| 维度 | 应用概述 | 关键实现 |
|------|---------|---------|
| **1. Prompt Engineering** | 多场景 System/User Prompt 设计，4 段结构化输出 | `ai.ts` — 少儿教练角色设定 + 格式约束 |
| **2. RAG** | 结构化棋艺知识库 + 语义检索式学习内容 | `learning-content.ts` — 开局/中局/残局知识图谱 |
| **3. Tool Calling** | 大模型与 Stockfish 引擎协作，AI 调用外部工具 | `chess.ts` — 引擎 UCI 协议通信 + 多级回退 |
| **4. Memory** | 多层级记忆体系：会话→错题→学习轨迹→周报 | `database.ts` — SQLite WAL + WAL 索引优化 |
| **5. Agent** | 三个 AI Agent：解题教练 / 对局复盘师 / 学习顾问 | `ai.ts` — 3 组独立 System Prompt + 函数路由 |
| **6. Multi-Agent** | Agent 间通过数据库协同；WebSocket 实时通信 | `websocket.ts` — 多角色实时同步 |
| **7. Safety Guard** | 多层安全防护：关键词过滤 + 超时熔断 + 输出校验 | `ai.ts` — `safeText()` + `AbortSignal.timeout()` |
| **8. Fallback** | 优雅降级：Ollama → Qwen API → Stockfish → 本地规则 | 全链路 4 级回退，确保服务永不中断 |

---

## 系统架构

```
┌──────────────┐     ┌──────────────────────────────────────┐
│   Browser    │────▶│           Nginx (:80/:443)            │
│  (Web App)   │     │    Reverse Proxy · SSL · WSS Upgrade  │
└──────────────┘     └──────────┬───────────────────────────┘
                                │
         ┌──────────────────────┼──────────────────────┐
         ▼                      ▼                      ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│  Backend :8080  │   │  Engine :8081   │   │  Ollama :11434  │
│  Fastify + TS   │──▶│  Stockfish HTTP │   │  qwen3:8b / API │
│  REST + WS      │   │  UCI Protocol   │   │  AI Explain     │
└────────┬────────┘   └─────────────────┘   └─────────────────┘
         │
         ▼
┌─────────────────┐   ┌─────────────────┐
│   SQLite (WAL)  │   │  Flutter App    │
│   持久化存储     │   │  iOS / Android  │
└─────────────────┘   └─────────────────┘
```

### 服务说明

| 服务 | 端口 | 技术 | 职责 |
|------|------|------|------|
| **Backend** | 8080 | Fastify + TypeScript | REST API + WebSocket 实时通信 |
| **Engine Service** | 8081 | Stockfish + HTTP Wrapper | 象棋引擎，UCI 协议通信 |
| **Ollama** | 11434 | Ollama + qwen3:8b | 本地 LLM，AI 解释与复盘 |
| **Nginx** | 80/443 | Nginx | 反向代理、SSL 终端、静态缓存 |
| **Flutter App** | — | Flutter + Dart | 移动端应用（iOS/Android） |

---

## 核心功能

### 🧩 学习模块
- **学习中心**：开局原则（5 课）、中局战略（3 课）、残局基础（3 课），配有交互式棋盘
- **题库训练**：300+ 道分级战术题（入门→进阶），支持提示、提交判定、错题复盘
- **AI 讲解**：每题做完后 AI 自动生成 4 段式讲解（思路/关键点/误区/建议）

### ⚔️ 对战模块
- **人机对战**：对接 Stockfish 16，支持 1-20 级难度调节
- **7 种变体**：标准/兵战/马战/象战/车战/后战/全能战
- **PvP 实时对战**：WebSocket 房间系统 + 倒计时棋钟 + 断线 60s 重连
- **走法建议**：AI 分析当前局面，给出建议走法和理由

### 👨‍👩‍👧 家长/老师模块
- **家长绑定**：绑定孩子账号，查看学习数据和周报
- **AI 周报**：自动生成学生周报评语（温暖鼓励 + 亮点 + 改进建议）
- **班级管理**：创建班级、邀请学生、布置作业、发布公告
- **进度追踪**：解题数、对战胜率、积分变化、段位晋升

### 🏆 竞技模块
- **竞技场**：自动匹配同段位对手
- **排行榜**：全球榜 + 班级榜
- **积分系统**：解题积分 + 对战积分 + 段位晋升
- **任务系统**：每日任务 + 积分奖励 + 商城兑换

### 💬 社交模块
- **好友系统**：搜索添加好友，好友列表
- **实时聊天**：WebSocket 实时消息，未读提醒
- **对局邀请**：向在线好友发起对局邀请

---

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| **后端框架** | Fastify + TypeScript | 高性能 HTTP 服务器，插件化架构 |
| **实时通信** | WebSocket (@fastify/websocket) | 对局、聊天、通知实时推送 |
| **数据库** | SQLite (better-sqlite3) | WAL 模式，12 张表，JSON 列支持 |
| **AI 推理** | Ollama (qwen3:8b) / Qwen API | 双模型切换 + 自动回退 |
| **象棋引擎** | Stockfish 16 | UCI 协议通信，多级回退策略 |
| **前端** | Vanilla JS + Chessboard.js | SPA，响应式设计 |
| **移动端** | Flutter 3.x | 8 个核心页面，跨平台 |
| **部署** | Docker + Nginx + Let's Encrypt | 一键部署脚本，HTTPS 自动续期 |

---

## 快速开始

### 前置条件
- Node.js 22+
- [Ollama](https://ollama.com) + `qwen3:8b` 模型（或配置 Qwen API Key）
- macOS: 编译 Stockfish（或使用 Docker）

### Stockfish 大文件配置

Stockfish 是本项目人机对战、局面分析和走法建议的核心引擎，不是可选的页面资源。由于 GitHub 禁止普通 Git 仓库接收超过 100 MB 的单个文件，下面两个运行时文件不会包含在 GitHub 仓库中：

```text
tools/stockfish/stockfish/stockfish-windows-x86-64-avx2.exe
tools/stockfish/stockfish/src/nn-c288c895ea92.nnue
```

这只影响首次配置，不改变任何页面或业务功能。请根据运行环境使用以下任一方式准备 Stockfish。

#### macOS / Linux：从仓库源码编译（推荐）

```bash
cd tools/stockfish/stockfish/src
make -j build ARCH=native
chmod +x stockfish
cd ../../../..
```

Stockfish 的构建脚本会按 `src/evaluate.h` 中声明的文件名获取并校验所需 NNUE 网络。构建完成后，将环境变量指向生成的程序：

```bash
STOCKFISH_BIN=../tools/stockfish/stockfish/src/stockfish
```

#### Windows：放入官方预编译程序

从 [Stockfish 官方下载页](https://stockfishchess.org/download/) 下载适合 CPU 的 Windows 版本，将可执行文件放到下列路径，或通过 `STOCKFISH_BIN` 指向实际文件：

```text
tools/stockfish/stockfish/stockfish-windows-x86-64-avx2.exe
```

#### Docker 部署

项目的 Dockerfile 会通过系统包安装 Stockfish，现有 Compose 配置使用 `/usr/games/stockfish`，不依赖仓库中的 Windows 可执行文件。

启动服务后，可通过日志中的 `Stockfish binary ready` 或 API 返回的 `engineSource: "stockfish"` 确认引擎已启用；如果显示 `fallback`，请检查 `STOCKFISH_BIN` 指向的文件是否存在且可执行。

### 本地开发

```bash
# 1. 编译 Stockfish（macOS Apple Silicon）
cd tools/stockfish/stockfish/src
make -j build ARCH=apple-silicon COMP=clang
chmod +x stockfish
cd ../../../..

# 2. 启动引擎服务
cd engine_service && cp .env.example .env && npm install && npm run dev &

# 3. 启动后端
cd backend && cp .env.example .env && npm install && npm run dev
```

打开 http://localhost:8080/ 即可使用。

### 生产部署

```bash
./deploy.sh --domain chesstong.com --email admin@chesstong.com
```

---

## 作品集文件索引

| 文件 | 内容 | 说明 |
|------|------|------|
| 📖 [`README.md`](./README.md) | 项目总览（本文件） | 作品集主文档 |
| 📝 [`LLM_ENGINEERING_NOTES.md`](./LLM_ENGINEERING_NOTES.md) | LLM 工程 8 维度深度分析 | Prompt/RAG/Tool/Memory/Agent/Multi-Agent/Safety/Fallback |
| 🧪 [`TEST_AND_FAILURE_LOG.md`](./TEST_AND_FAILURE_LOG.md) | 测试与故障记录 | 10+ 轮测试，5+ 故障分析与修复 |
| 📋 [`CHANGELOG.md`](./CHANGELOG.md) | 变更日志 | 15 条重要变更记录 |
| 📊 [`docs/qiban-project-plan-clean.pptx`](./docs/qiban-project-plan-clean.pptx) | 项目计划 PPT | 11 页展示文稿 |
| 📄 [`docs/api-contract.md`](./docs/api-contract.md) | API 接口文档 | 全部 REST API 说明 |
| 📱 [`flutter_app/`](./flutter_app/) | Flutter 移动端 | 8 个核心页面 |
| 🐳 [`infra/docker/`](./infra/docker/) | Docker 部署配置 | docker-compose + Nginx |

---

## 项目进展

| 阶段 | 状态 | 说明 |
|------|------|------|
| ✅ **Web 平台上线** | 已完成 | 全部功能模块可用，部署于 chesstong.com |
| ✅ **移动端 MVP** | 已完成 | Flutter App 含 8 个核心页面 |
| ✅ **AI 集成** | 已完成 | Ollama/Qwen 双模型 + Stockfish 引擎 |
| ✅ **实时对战** | 已完成 | WebSocket 房间 + 棋钟 + 断线重连 |
| ✅ **协会认可** | 已获得 | 获渝中区国际象棋协会认可 |
| 🔄 **区域推广** | 进行中 | 服务当地初学者，收集反馈 |

---

## 社会效益

> **社会效益优先：从渝中到重庆，帮助更多初学者。**

- 🧒 **降低入门门槛**：不让孩子被专业术语挡在门外
- 👨‍👩‍👧 **帮助家长陪伴**：不懂棋也能看见练习和进步
- 👨‍🏫 **提升老师效率**：课后练习可追踪、可反馈
- 🏙️ **服务重庆少儿国象普及**：从渝中试点，逐步服务更多区域

---

<p align="center">
  <b>Chesstong — 孩子、家长和老师之间的一座桥。</b><br>
  <sub>Made with ❤️ by a chess lover who started at age 6.</sub>
</p>
