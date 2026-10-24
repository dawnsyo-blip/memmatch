# 问卷配置格式说明

问卷写在 `data/questionnaire/questions.json`。网站只读取这个文件来显示题目、计算推荐，代码里不写死任何题目。改题目、加选项、调整作用，都只改这个文件。

## 一道题的结构

```json
{
  "id": "client",              // 题目编号，英文，不重复
  "kind": "hard",              // hard＝硬条件（筛掉用不了的）；preference＝偏好（加分排序）
  "type": "multi",             // single＝单选；multi＝多选
  "combine": "any",            // 多选题怎么合并，见下文
  "text": "你平时在哪里和 AI 聊天？",
  "help": "题目下方的小字说明（可省略）",
  "show_if": {"question": "devices", "selected_any": ["computer"]},  // 只在前面某题选了某项时才显示（可省略）
  "options": [
    {"id": "claude_desktop", "label": "Claude 桌面版", "help": "选项说明（可省略）", "effect": { ... }}
  ]
}
```

## 选项的“作用”（effect）

字段名用项目 JSON 里 `normalized` 下的字段（如 `compatible_clients`、`runs_on`、`os`），另外可用 `category`（收录类别）。可选值见 `docs/review-normalization.md` 开头的表。

| 写法 | 含义 | 例子 |
|---|---|---|
| `"require": {字段: [值…]}` | 项目的这个字段至少有一个值在列表里，才保留 | `{"require": {"difficulty": ["low", "medium"]}}`：只留门槛低或中的 |
| `"exclude_only": {字段: [值…]}` | 项目的这个字段**全部**落在列表里，就排除；有其它选择的保留 | `{"exclude_only": {"data_passes_through": ["third_party"]}}`：排除只能用第三方服务器的，能自己部署的保留 |
| `"when_only": {字段: [值…]}` | 和上面两条配合：只对这个字段全部落在列表里的项目生效 | 系统题只管“只能装在自己电脑上”的项目，装在服务器或云上的不受影响 |
| `"allow": {字段: [值…]}` | 配合题目的 `"combine": "allow"` 使用，见下文 | |
| `{}` | 没有作用（如“都可以”） | |
| `"score": {字段: {值: 分数}}` | **偏好题用**：项目的这个字段有该值就加分 | `{"score": {"write_mode": {"review_first": 3}}}`：先审核再记的加 3 分 |

## 多选题怎么合并（combine）

- `"any"`：项目满足**任意一个**已选选项的作用就保留。例如“在哪里聊天”选了 Claude 桌面版和 ChatGPT，能配合其中任意一个的都保留。
- `"allow"`：每个选项“允许”一些值，项目这个字段的**所有值**都必须在“已允许的值＋题目的 `always_allowed`”里。例如账号题：项目需要的每一个账号都得是你勾选过的，`none`（不需要账号）总是允许。

## 文档没写清的情况

项目某个字段是“文档未说明”（`unknown`）时，硬条件**不会因此把它排除**，而是在推荐结果里标出“这一点文档没写，需要你自己确认”。这样不会因为说明文档写得简略就错过项目。

## 偏好题怎么写

偏好题 `kind` 写 `preference`，选项用 `score`。可以对 `normalized` 里的任何字段加分，包括用户在意的 19 个特性（值为 `yes` 表示有），以及 2026-10-24 追加的 9 个字段：

| 字段 | 含义 | 可选值 |
|---|---|---|
| `ranking_signals` | 排序、取舍记忆时考虑的因素 | `semantic` 语义相似、`keyword` 关键词、`recency` 新旧、`importance` 重要性、`frequency` 使用频率、`emotion` 情感强度、`relation` 关联扩散、`confidence` 置信度 |
| `scoring_stages` | 在哪一步打分 | `write` 写入、`retrieve` 召回、`forget` 遗忘 |
| `multi_factor` | 多维还是单一打分 | `multi`（相似度之外至少两个因素）、`single` |
| `emotion_handling` | 情绪怎么处理 | `tags` 情绪标签、`weighting` 情绪影响保留或召回、`ai_state` AI 自己的情绪或身体状态、`user_mood` 记录用户心情 |
| `project_role` | 项目定位 | `full_memory` 完整记忆系统、`context_tool` 上下文延续工具、`memory_component` 记忆部件、`state_engine` 状态引擎、`companion_app` 自带记忆的应用、`dev_framework` 开发框架、`guide` 教程 |
| `lifecycle` | 覆盖的记忆环节 | `capture` 写入、`consolidate` 整理、`retrieve` 召回、`forget` 遗忘、`review` 人工查看修改 |
| `lifecycle_complete` | 流程是否完整 | `complete`（五个环节都有）、`partial` |
| `pairing` | 能否和其它项目搭配 | `designed_to_pair`、`standard_interface`、`replaces_builtin`、`self_contained`、`depends_on` |
| `customization` | 便于自己改的地方 | `settings_ui`、`config_file`、`prompts`、`plain_data`、`plugin_api`、`small_code` |

多选字段里没找到任何依据时值为 `not_mentioned`（未提及）。例如：

```json
{
  "id": "continuity",
  "kind": "preference",
  "type": "multi",
  "text": "你最在意记忆库的哪些能力？",
  "options": [
    {"id": "persona", "label": "让 AI 保持同一个人格，换窗口、换模型也不变",
     "effect": {"score": {"persona_continuity": {"yes": 3}}}},
    {"id": "handoff", "label": "开新窗口时能接着上次聊",
     "effect": {"score": {"window_handoff": {"yes": 3}}}},
    {"id": "review", "label": "AI 记下的东西要先经我同意",
     "effect": {"score": {"write_mode": {"review_first": 3}}}}
  ]
}
```
