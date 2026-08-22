---
name: check-fen
description: 校验棋盘局面（FEN）是否合法，检查所有内置题目或指定FEN字符串
---

# 棋盘局面校验技能

当用户调用 `/check-fen` 或请求校验棋盘局面时，执行以下操作：

## 1. 确定校验模式

- 如果用户没有提供 FEN 字符串 → 校验所有内置题目
- 如果用户提供了 FEN 字符串 → 仅校验该 FEN
- 如果用户指定了某个题目 ID → 仅校验该题目

## 2. 执行校验

运行校验脚本：

```bash
cd "/Users/daweijunwang/chess project/backend" && node node_modules/tsx/dist/cli.mjs scripts/validate-fen.ts
```

校验单个 FEN：
```bash
cd "/Users/daweijunwang/chess project/backend" && node node_modules/tsx/dist/cli.mjs scripts/validate-fen.ts "<FEN字符串>"
```

输出 JSON 格式（供程序分析）：
```bash
cd "/Users/daweijunwang/chess project/backend" && node node_modules/tsx/dist/cli.mjs scripts/validate-fen.ts --json
```

## 3. 校验项目说明

脚本会检查以下内容：

| 校验项 | 严重级别 | 说明 |
|--------|----------|------|
| FEN 语法 | error | 通过 chess.js 验证格式是否合法 |
| 王的数量 | error | 双方各恰好 1 个王 |
| 兵的位置 | error | 兵不能在第1排或第8排（底线） |
| 两王相邻 | error | 白王与黑王不能相邻 |
| 非行棋方被将军 | error | 刚走完棋的一方不能将自己的王留在被将军状态 |
| 棋子数量 | warn/error | 单方不超过16子，单兵种不超过合理上限 |
| 解答合法性 | error | 标准答案能否在当前局面走出 |
| 题目类型匹配 | warn | mate_in_1 必须将死、promotion 必须升变、fork 要同时攻击两个目标等 |

## 4. 结果解读

- **error**：棋盘局面确实有错误，需要修复
- **warn**：可能有问题的局面，值得人工复查
- **info**：仅供参考的信息

## 5. 常见错误及修复建议

- **"对方的王正在被将军"**：FEN 中 active color 写错了，或者上一步是非法着法。检查 FEN 的第二个字段（w/b）
- **"解答不合法"**：solutionUci 或 acceptedAnswers 中有写错的着法，或者 FEN 与解答不匹配
- **"并未将死对方"**：mate_in_1 题目的解答没有形成将杀，需要检查 solution
- **"兵出现在底线"**：FEN 的兵排列有误，漏了升变
