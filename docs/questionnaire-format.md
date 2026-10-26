# 问卷配置格式说明

问卷写在 `data/questionnaire/questions.json`。网站和推荐引擎（`engine/`）只读这个文件，代码里不写死任何题目。改题目、加选项、调整作用、改加分，都只改这个文件；改完运行 `npm test`，确认 10 个虚构用户的推荐仍符合期望。

内容对应负责人的《记忆库推荐问卷 v4》。

## 整体结构

```json
{
  "version": "v4-2026-10-26",
  "rank_weights": [3, 2, 1], "rank_rest": 1,
  "result": {"top_n": 8, "min_results": 3, "unknown_penalty": 1},
  "field_labels": {"runs_on": "运行位置", "model_api_key": "大模型接口密钥"},
  "questions": [],
  "preferences": [],
  "addons": []
}
```

| 键 | 含义 |
|---|---|
| `rank_weights`、`rank_rest` | 排序题第 1、2、3 名的倍数，之后每项的倍数 |
| `result.top_n` | 推荐列表显示几个 |
| `result.min_results` | 结果少于这个数时，给出放宽建议 |
| `result.unknown_penalty` | 硬条件里每有一项“文档没写”就扣的分，让明确能用的排在前面 |
| `field_labels` | 给用户看的字段名、账号名、门槛说明 |

## 一道题

```json
{
  "id": "q5", "kind": "hard", "type": "multi", "short": "记忆库放在哪",
  "text": "可以接受记忆库放在哪里运行？", "help": "题目下方的小字",
  "show_if": {"question": "q3", "selected_any": ["remote_control"]},
  "options": [{"id": "computer", "label": "一台经常开着的电脑", "help": "选项小字", "effect": {}}],
  "rules": [],
  "relax": [],
  "exclude_reason": "被这道题排除时显示的原因"
}
```

| 键 | 含义 |
|---|---|
| `kind` | `hard` 硬条件（筛掉用不了的）；`preference` 偏好（加分）；`info` 只收集信息，给别的题引用 |
| `type` | `single` 单选；`multi` 多选；`rank` 多选并排序（越靠前越重要） |
| `show_if` | 只在条件成立时显示；不显示的题，答案不参与推荐 |
| `short` | 短名字，报告和排除原因里用 |
| 选项的 `free_text` | 选这项时让用户填空 |
| 选项的 `exclusive` | 和其它选项互斥（如“都不想”） |
| 选项的 `default_if` | 条件成立时默认选中（前端用，用户可以改） |
| 选项的 `values` | 这个选项代表的字段值，供本题的 `union`／`allow` 合并或别的题的 `require_selected` 引用 |
| 选项的 `disables` | 选了这项，就让别的题的某些选项失效，见下文 |
| 选项的 `notice` | 这个选项一个项目都接不上时（比如官方 App 接不了外部记忆），给用户的提醒 |

## 条件（`when`、`show_if`、`default_if` 里用）

| 写法 | 含义 |
|---|---|
| `{"question": "q1", "selected_any": ["anthropic"]}` | 选了其中任意一项 |
| `{"question": "q1", "selected_none": ["anthropic"]}` | 一项都没选 |
| `{"question": "q3", "selected_only_within": ["official", "mcp_client"]}` | 选了，而且只选了这些里面的 |
| `{"question": "q3", "not_only_within": ["official", "app"]}` | 至少选了一项不在列表里的 |
| `{"question": "q7", "rank_top": 2, "selected_any": ["companion"]}` | 排序题前 2 名里有 |
| `{"all": [条件, …]}`、`{"any": [条件, …]}` | 同时满足／满足其一 |

## 硬条件的作用（`effect`、`rules`）

字段名用项目 JSON 里 `normalized` 下的字段（如 `compatible_clients`、`runs_on`），另有三个虚拟字段：`category`（收录类别）、`id`、`single_entry`（只能装在单个宿主里又没有 MCP 或网关，值为 `yes`/`no`）。

| 写法 | 含义 |
|---|---|
| `"require": {字段: [值…]}` | 项目这个字段至少有一个值在列表里才保留 |
| `"exclude_any": {字段: [值…]}` | 项目这个字段有任何一个值在列表里就排除 |
| `"exclude_only": {字段: [值…]}` | 项目这个字段全部落在列表里才排除（有其它选择的保留） |
| `"require_selected": {"question": "q3a", "field": "compatible_clients", "extra": [...], "fallback": [...]}` | 项目的字段要和另一题所选选项的 `values` 有交集；`extra` 总是允许，`fallback` 是那道题没答时用的值 |
| `"when": 条件` | 条件不成立时，这个作用不生效 |
| `"unless_project": {字段: [值…]}` | 项目满足这些（每个字段都满足）时，这个作用不生效 |
| `"any_of": [作用, …]` | 满足其中任意一个生效的作用即可；一个都不生效时视为不满足 |

**文档没写的字段**：`require` 遇到项目字段是“文档未说明”（`unknown`）时不排除，结果里标“需自行确认”，并按 `unknown_penalty` 扣一点分。

**多选题怎么合并**：
- 默认（`any`）：项目满足任意一个所选选项的作用就保留
- `"combine": "union"`：把所选选项的 `values[union_field]` 合起来，项目这个字段要和它有交集；题目上的 `unless_project` 用于跳过某类项目（如自带记忆的应用不看运行位置）
- `"combine": "allow"`：账号题用。项目需要的**每一个**值都要被允许。`constraint` 里：
  - `always_allowed` 总是允许
  - `extra_allow` 按条件额外允许，可加 `when_project`
  - `hosting_only` 写明某个值只在托管模式下需要（如项目方账号）
  - 选项的 `values_when` 限定这个选项什么时候才放行

**系统题**：`"constraint": {"type": "os_match", "applies_runs_on_only": ["own_computer"]}`，只装在自己电脑上的项目和自带记忆的应用，要支持用户所选设备的系统（取自选项的 `values.os`）。

**题目级规则 `rules`**：不看选了哪项、只看条件的作用，比如“第 1 题没选 Anthropic 就排除只能配合 Claude 的项目”。规则还可以带：
- `reason`：排除原因
- `note` 和 `note_if`：给满足某些条件的项目加一条注意事项
- `score`：加分

**选项失效 `disables`**：

```json
"disables": [{"question": "q17", "options": ["api_key"], "unless_project": {"local_model": ["yes"]}}]
```

选了这项（如预算 0 元），别的题的这些选项就不算数；`unless_project` 写明对哪些项目仍然算数。

**放宽建议 `relax`**：结果太少时，引擎逐条尝试，只把能多出结果的那几条告诉用户；单独放宽哪一条都不够时，再试两条一起放宽（最多列 6 条）：

```json
"relax": [{"label": "能照着教程敲几条命令", "set": "medium"}, {"label": "接受托管", "add": ["hosted"]}]
```

`set` 把这道题改成某个选项，`add` 给多选题加上某些选项。

## 偏好题的加分（`score`）

```json
"effect": {"score": [
  {"if": {"write_mode": ["review_first"]}, "points": 4, "reason": "先给您审核，您同意了才记"},
  {"if": {"reflection": ["yes"], "error_guard": ["yes"]}, "points": 2, "reason": "反思得出的结论能追溯到原话"},
  {"if": {"recall_uses_llm": ["llm"]}, "points": -1, "reason": "召回时要调用大模型，会慢一些"}
]}
```

| 键 | 含义 |
|---|---|
| `if` | 每个字段都要满足（与 `require` 相同）；值写 `"*"` 表示“有任何已知值” |
| `points` | 分数；负数表示扣分，`reason` 会进“注意” |
| `reason` | 写进推荐理由（取得分最高的 3 条） |
| `unless` | 项目满足这些时不加分 |
| `when_answers` | 只在答卷满足条件时生效 |

排序题按名次乘 `rank_weights`。

## 推荐偏好 `preferences`

和 `score` 规则写法相同，多一个 `overridden_by`：列出的题只要用户答了，这条偏好就不生效（用户答案优先）。

## 补充部件 `addons`

```json
{"id": "context_tool", "title": "上下文延续工具", "why": "给用户看的说明",
 "when": 条件, "require": {"project_role": ["context_tool"]}, "pick": 2}
```

条件成立时，从通过筛选的项目里挑出满足 `require` 的前几个，单独列出，并用于组合方案。

## 引擎输出

见 `engine/index.js` 的注释：

| 键 | 含义 |
|---|---|
| `results` | 推荐，含理由、注意事项、需自行确认的地方、方便二改的地方 |
| `addons` | 补充部件 |
| `guides` | 相关教程 |
| `combos` | 组合方案，分三种：一个项目覆盖全流程；设计上就搭配使用的一对（字段 `pairs_with`）；记忆库＋补充部件 |
| `excluded` | 被排除的项目及原因 |
| `notices` | 提醒 |
| `relax` | 放宽建议 |

## 能用的字段

`normalized` 里的全部字段都能用。可选值见 `docs/review-normalization.md` 开头的表，以及：
- `scripts/feature_rules.py`：19 个用户在意的特性
- `scripts/dimension_rules.py`：打分、情绪、定位、搭配、中文、手机可达等维度字段

能托管又能自己部署的项目，`vendor_account` 只算托管模式的要求（见账号题的 `hosting_only`）。

字段值大多经过逐项核实（`data/readme_verification.json`，状态 `verified`）。`setup_device` 表示只用手机能否装好（`phone_ok`／`needs_computer`），第 2 题用它排除没有电脑的用户装不了的项目。

2026-10-26 新增的两个字段只靠逐项核实、规则不自动判定：`multi_agent`（`shared` 写明几个 Agent 共用／`per_agent` 能按 Agent 分开空间或权限，第 4a 题加分）、`media_recall`（`image`／`audio`／`video`，能保管并召回原件，第 8a 题加分）。没核实到的都是 `not_mentioned`，所以只用来加分，不用来排除。

偏好题的 `rules` 只算分，`note` 不会生效（筛选时跳过偏好题）；要给卡片加注意事项，得写在硬条件题或 `info` 题上。
