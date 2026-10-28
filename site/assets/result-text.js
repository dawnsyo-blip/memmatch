/* 结果页里两段“写出来的”文字：每个项目“相比其它几个”的一句，和给用过记忆服务的人的改进建议。
   现在用规则生成；以后接 LLM 时由服务器返回同样结构（{项目 id: 一句话}、[{ id, label, text, examples }]），
   页面不用改，LLM 出错或超时就退回这里的结果。 */
import { projectMatches } from "../../engine/index.js";

// 拿来比较的能力，按对用户的重要程度排；skip 是推荐理由里已经说过的同一件事，说过就不重复
const EDGE = [
  { has: { write_mode: ["review_first"] }, text: "先给您看候选，确认后才入库", skip: /候选/ },
  { has: { write_receipt: ["yes"] }, text: "写入后会明确回执", skip: /回执/ },
  { has: { sensitive_suppression: ["yes"] }, text: "能压住您不想再提的事", skip: /压住/ },
  { has: { media_recall: ["image", "audio", "video"] }, text: "能保存原图或原声，想起来时交回原件" },
  { has: { forgetting: ["archive"] }, text: "删掉的记忆只是归档，还能找回", skip: /归档/ },
  { has: { reflection: ["yes"], error_guard: ["yes"] }, text: "自己反思得出的结论能追溯到原话", skip: /反思/ },
  { has: { dream_consolidation: ["yes"] }, text: "空闲时会自动整理、去重", skip: /整理|去重|合并/ },
  { has: { memory_layers: ["layered"] }, text: "把记忆分层管理", skip: /分层/ },
  { has: { emotion_handling: ["weighting"] }, text: "情绪重的记忆记得更牢", skip: /情绪重|情感重/ },
  { has: { verbatim: ["yes"] }, text: "保留原话，可以核对", skip: /原话|原始记录/ },
  { has: { window_handoff: ["yes"] }, text: "开新窗口能接上之前的内容", skip: /新窗口/ },
  { has: { time_awareness: ["yes"] }, text: "记得每件事是什么时候的", skip: /什么时候|时间线/ },
  { has: { error_guard: ["yes"] }, text: "改动保留历史，记错了能改回来", skip: /纠错|追溯/ },
  { has: { pinning: ["yes"] }, text: "能把重要的记忆钉住，一直带着" },
  { has: { proactive: ["yes"] }, text: "会主动提起相关的事" },
  { has: { lifecycle_complete: ["complete"] }, text: "从写入到遗忘全流程都有", skip: /全流程/ },
  { has: { difficulty: ["low"] }, text: "下载安装或一键安装就能用" },
  { has: { spend: ["none"] }, text: "不需要额外花钱" },
  { has: { local_model: ["no_model_needed"] }, text: "完全不调用大模型" },
  { has: { customization: ["settings_ui"] }, text: "能在界面里改设置", skip: /界面里改/ },
  { has: { customization: ["plain_data"] }, text: "记忆是普通文件，可以直接打开改", skip: /普通文件/ },
  { has: { chinese_support: ["zh_retrieval"] }, text: "中文检索做过优化", skip: /中文检索/ },
  { has: { multi_agent: ["per_agent"] }, text: "能给不同的 Agent 分开记忆", skip: /分开/ },
  { has: { retrieval_postprocess: ["rerank", "dedup"] }, text: "召回后还会重排、去重", skip: /重排/ },
];

// 在同一批推荐里找“只有它有”的能力；没有独有的，再找“只有它和另一个有”的
export function edgeLines(results, byId) {
  const out = {};
  if (results.length < 2) return out;
  const n = results.length;
  const holders = EDGE.map((f) => results.filter((r) => byId[r.id] && projectMatches(byId[r.id], f.has)).map((r) => r.id));
  for (const r of results) {
    const said = r.reasons.join("；");
    const usable = EDGE.map((f, i) => ({ f, ids: holders[i] }))
      .filter(({ f, ids }) => ids.includes(r.id) && !(f.skip && f.skip.test(said)));
    const only = usable.filter((x) => x.ids.length === 1).slice(0, 2);
    if (only.length) { out[r.id] = `这 ${n} 个里只有它：${only.map((x) => x.f.text).join("；")}。`; continue; }
    const pair = usable.find((x) => x.ids.length === 2);
    if (pair) {
      const other = results.find((x) => x.id === pair.ids.find((id) => id !== r.id));
      out[r.id] = `这 ${n} 个里只有它和 ${other.name}：${pair.f.text}。`;
    }
  }
  return out;
}

// 改进建议：按问卷第 8 题的说明写；“做到的项目”直接用这道题的加分规则判断，和推荐引擎一致
const ADVICE = {
  entry_hallucination: "LLM 说“记住了”，不一定真的写进去了。选能随时打开查看记了什么的，最好写入后有回执，或者先给您看候选再入库。",
  window_loss: "记忆要存在对话窗口以外，新窗口开始时自动读回来；几个入口共用一份记忆，换个地方聊也接得上。",
  overwrite: "新信息不该直接盖掉旧的。选改动时保留历史、记得每件事发生时间的，记错了还能改回来。",
  no_priority: "只按“像不像”找记忆，常提的小事会挤掉少提的大事。选综合重要性、新旧、情绪等多个维度排序的，最好还能压住您不想再提的事。",
  you_me: "只存摘要时，“谁说的”最容易丢。选保留原话、每条记忆都能追溯来源的。",
  stereotype: "只记一句结论，会丢掉事情的前因后果。选保留原话、有时间线的，最好还能区分确定和不确定的认识。",
  verbatim_repeat: "原话可以留档，平时想起的应该是整理过的摘要，LLM 就不会一字一句念回来。",
  fabrication: "LLM 自己反思得出的结论，要能追溯到原话；追溯不到的反思，反而容易编出没发生过的事。",
  messy: "要有整理这一步：空闲时自动合并重复、清理过时的记忆，召回的内容才不会越堆越多、越来越慢。",
};

const EXPERIENCED = ["native", "notes", "open_source", "other"];

export function isExperienced(answers) {
  return [].concat(answers.q6 || []).some((v) => EXPERIENCED.includes(v));
}

export function adviceItems(answers, questionnaire, results, byId) {
  if (!isExperienced(answers)) return [];
  const q = questionnaire.questions.find((x) => x.id === "q8");
  return [].concat(answers.q8 || []).filter((id) => ADVICE[id]).map((id) => {
    const opt = q.options.find((o) => o.id === id);
    // 只看 1 分以上的规则：“随时能看到记了什么”（0.5 分）几乎每个项目都有，算进来就失去了参考意义
    const rules = (opt.effect?.score || []).filter((s) => s.points >= 1);
    const examples = results.filter((r) => {
      const p = byId[r.id];
      return p && rules.some((s) => projectMatches(p, s.if) && !(s.unless && projectMatches(p, s.unless)));
    }).slice(0, 3).map((r) => r.name);
    return { id, label: opt.label, help: opt.help, text: ADVICE[id], examples };
  });
}
