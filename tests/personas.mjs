// 阶段 4 的虚构用户画像。每个画像有答卷和“期望”（写成人能读懂的话），具体断言在 personas.test.js。
// 偏好题没写的按这里的默认值填。

const DEFAULTS = {
  q6: "native", q7: ["companion"], q8: ["no_priority"], q9: "auto_review", q10: "any", q11: "any",
  q12: "sometimes", q13: "emotional", q14: "few", q15: "unknown",
};

export const PERSONAS = [
  {
    id: "claude_app_lazy",
    title: "只用 Claude 手机 App、只有 iPhone、只想点几下",
    answers: { q1: ["anthropic"], q2: ["iphone"], q3: ["official"], q4: "single", q5: ["phone", "cloud_free"],
               q16: "low", q17: ["subscription"], q18: "ten" },
    expect: "库里没有“点几下就能用”又能接 Claude App 的记忆库：结果为空，并给出“能照着教程敲命令”等放宽建议",
  },
  {
    id: "claude_app_tutorial",
    title: "只用 Claude 手机 App，能照着教程操作，愿意注册免费云平台",
    answers: { q1: ["anthropic"], q2: ["iphone"], q3: ["official"], q4: "single", q5: ["phone", "cloud_free"],
               q16: "medium", q17: ["subscription"], q18: "ten" },
    expect: "没有电脑，要用电脑敲命令部署的 MemHeaven 不推荐；没勾 GitHub 账号时结果为空，放宽建议里有“注册 GitHub 账号”（可得全程浏览器部署的 Aelios）",
  },
  {
    id: "claude_app_github",
    title: "只用 Claude 手机 App，能照着教程操作，愿意注册免费云平台和 GitHub",
    answers: { q1: ["anthropic"], q2: ["iphone"], q3: ["official"], q4: "single", q5: ["phone", "cloud_free"],
               q16: "medium", q17: ["subscription", "github"], q18: "ten" },
    expect: "推荐全程在浏览器里部署到自己 Cloudflare 账号、能被 Claude App 连上的 Aelios",
  },
  {
    id: "deepseek_official",
    title: "只用 DeepSeek 官方 App",
    answers: { q1: ["deepseek"], q2: ["android"], q3: ["official"], q4: "single", q5: ["phone"],
               q16: "low", q17: ["none"], q18: "zero" },
    expect: "官方 App 接不了外部记忆：没有推荐，提醒原因；用户没有电脑，放宽建议不该是“遥控电脑”，而是换自带记忆的应用并准备 API Key 这类",
  },
  {
    id: "claude_code_remote",
    title: "用 Claude App 遥控电脑上的 Claude Code，Mac 一直开着",
    answers: { q1: ["anthropic"], q2: ["iphone", "mac"], q3: ["remote_control"], q3a: ["claude_code"], q4: "single",
               q5: ["computer"], q16: "medium", q17: ["subscription", "api_key"], q18: "ten" },
    expect: "选择很多：本地的 MCP 记忆库都可以用；推荐的都能配合 Claude Code、能装在电脑上，没有自带界面的应用",
  },
  {
    id: "kelivo_vps",
    title: "安卓手机用 Kelivo＋DeepSeek API，有一台 VPS，能照着教程操作",
    answers: { q1: ["deepseek"], q2: ["android", "server"], q3: ["mcp_client"], q4: "single", q5: ["server"],
               q16: "medium", q17: ["api_key"], q18: "fifty" },
    expect: "推荐手机能连上的记忆库，包括专为 Kelivo 写的 Dylan Heartbeat；不推荐只能装在酒馆里的扩展",
  },
  {
    id: "sillytavern_roleplay",
    title: "Windows 电脑跑酒馆做角色扮演，手机用浏览器访问",
    answers: { q1: ["deepseek", "anthropic"], q2: ["android", "windows"], q3: ["sillytavern"], q4: "single",
               q5: ["computer"], q7: ["roleplay", "companion"], q16: "medium", q17: ["api_key"], q18: "ten" },
    expect: "酒馆的记忆扩展排在前面；同时推荐可搭配的情绪、身体状态引擎",
  },
  {
    id: "astrbot_qq",
    title: "QQ 里的 AstrBot 机器人，跑在服务器上",
    answers: { q1: ["deepseek"], q2: ["android", "server"], q3: ["programmatic"], q3a: ["bot_framework"], q4: "single",
               q5: ["server"], q16: "medium", q17: ["api_key"], q18: "ten" },
    expect: "推荐 AstrBot 插件；不推荐只能装在 OpenClaw 里的插件",
  },
  {
    id: "novice_phone_free",
    title: "新手，只有安卓手机，只能 0 元，想直接用自带记忆的应用",
    answers: { q1: ["deepseek"], q2: ["android"], q3: ["app"], q4: "single", q5: ["phone"], q6: "none",
               q16: "low", q17: ["none"], q18: "zero" },
    expect: "结果很少，给出放宽建议（如改用 Kelivo 这类客户端）",
  },
  {
    id: "privacy_local_free",
    title: "只用本地开源模型、Linux 电脑、只能 0 元、不想注册任何账号",
    answers: { q1: ["local"], q2: ["android", "linux"], q3: ["programmatic"], q3a: ["other"], q4: "single",
               q5: ["computer"], q16: "high", q17: ["none"], q18: "zero" },
    expect: "推荐的都免费，或者能用本地模型；不推荐只能托管的；不需要任何账号",
  },
  {
    id: "codex_multi_review",
    title: "GLM＋OpenAI，手机遥控电脑上的 Codex，多端共用，要先审核再入库，情感重的要留着",
    answers: { q1: ["glm", "openai"], q2: ["iphone", "server", "windows"], q3: ["programmatic", "remote_control"],
               q3a: ["codex"], q4: "multi", q5: ["computer"], q6: "know", q7: ["work", "coding"], q8: ["no_priority"],
               q9: "review_first", q11: "now", q12: "often", q13: "emotional", q14: "long", q15: "yes",
               q16: "high", q17: ["api_key"], q18: "fifty" },
    expect: "Ombre Brain 排在前列；前 8 名里有先审核再入库的项目；组合方案里有 Ombre Brain＋Machine Studio；不推荐只能配合 Claude 的项目",
  },
];

export function answersOf(persona) {
  return { ...DEFAULTS, ...persona.answers };
}
