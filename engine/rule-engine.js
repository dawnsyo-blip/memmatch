// 规则推荐引擎：读取问卷配置（data/questionnaire/questions.json），对项目做硬条件筛选、偏好打分、生成理由。
// 代码里不写死任何题目；题目、选项和每个选项的作用都来自配置，格式见 docs/questionnaire-format.md。
// 浏览器和 Node 都能运行（纯 ES 模块，没有依赖）。

const CATEGORY_APP = "自带记忆的应用";
const DISABLED = "__disabled__"; // 已选选项全部失效后的占位值，见 answersFor

// ---------- 读项目字段 ----------

function fieldValues(project, field) {
  if (field === "category") return [project.candidate.category];
  if (field === "id") return [project.id];
  if (field === "single_entry") return [isSingleEntry(project) ? "yes" : "no"];
  const item = project.normalized[field];
  if (!item) return [];
  const v = item.value;
  if (Array.isArray(v)) return v;
  return v === null || v === undefined || v === "" ? [] : [v];
}

function fieldUnknown(project, field) {
  const item = project.normalized[field];
  return !!item && (item.status === "unknown" || fieldValues(project, field).length === 0);
}

// 只能在单个宿主里用、又没有 MCP 或网关的项目（多端共用时排除）
function isSingleEntry(project) {
  const access = fieldValues(project, "access");
  const clients = fieldValues(project, "compatible_clients").filter((c) => c !== "developer_built");
  return !access.includes("mcp") && !access.includes("gateway") && clients.length <= 1;
}

const intersects = (a, b) => a.some((x) => b.includes(x));

// 项目是否满足 {字段: [值]}（每个字段都要有交集）；"*" 表示有任何已知值（不含“未提及”）
function projectMatches(project, spec) {
  return Object.entries(spec).every(([field, wanted]) => {
    const vals = fieldValues(project, field);
    if (wanted.includes("*")) return vals.some((v) => v !== "not_mentioned");
    return intersects(vals, wanted);
  });
}

// ---------- 读答卷 ----------

function selected(answers, qid) {
  const a = answers[qid];
  if (a === undefined || a === null || a === "") return [];
  return Array.isArray(a) ? a : [a];
}

function checkCond(cond, answers) {
  if (!cond) return true;
  if (cond.all) return cond.all.every((c) => checkCond(c, answers));
  if (cond.any) return cond.any.some((c) => checkCond(c, answers));
  let sel = selected(answers, cond.question);
  if (cond.rank_top) sel = sel.slice(0, cond.rank_top);
  if (cond.answered !== undefined) return (sel.length > 0) === cond.answered;
  if (cond.selected_any) return intersects(sel, cond.selected_any);
  if (cond.selected_none) return !intersects(sel, cond.selected_none);
  if (cond.selected_only_within) return sel.length > 0 && sel.every((s) => cond.selected_only_within.includes(s));
  if (cond.not_only_within) return sel.some((s) => !cond.not_only_within.includes(s));
  throw new Error("不认识的条件：" + JSON.stringify(cond));
}

// 前端判断跳题（show_if）、默认勾选（default_if）也用这一个函数，保证和引擎同一套规则
export { checkCond as checkCondition, projectMatches };

// 前后矛盾：选了某项（如预算 0 元）让别的题已选的选项（如“新买 VPS”）不算数。答题页和结果页都用。
// 返回 [{ question, option, by_question, by_option, partial, emptied, message }]
//   partial  只对一部分项目不算数（写了 unless_project）
//   emptied  那道题已选的选项全部不算数，等于这道题没有可用的回答
export function findConflicts(questionnaire, answers) {
  const Q = questionnaire.questions;
  const byId = Object.fromEntries(Q.map((q) => [q.id, q]));
  const a = { ...answers };
  for (const q of Q) if (q.show_if && !checkCond(q.show_if, a)) delete a[q.id];
  const num = (q) => `第 ${q.number || q.id.slice(1)} 题`;
  const label = (q, id) => q.options.find((o) => o.id === id)?.label || id;
  const out = [];
  for (const q of Q) {
    for (const opt of q.options || []) {
      if (!selected(a, q.id).includes(opt.id)) continue;
      for (const d of opt.disables || []) {
        const t = byId[d.question];
        const sel = selected(a, d.question);
        for (const o of d.options.filter((x) => sel.includes(x))) {
          out.push({ question: t.id, option: o, by_question: q.id, by_option: opt.id, partial: !!d.unless_project,
            message: `${num(q)}选了“${label(q, opt.id)}”，${num(t)}的“${label(t, o)}”${d.unless_project ? "只对一部分项目算数" : "就不算数了"}${d.note ? `：${d.note}` : ""}` });
        }
      }
    }
  }
  // 某道题已选的选项全部被无条件地去掉
  for (const qid of new Set(out.map((c) => c.question))) {
    const gone = new Set(out.filter((c) => c.question === qid && !c.partial).map((c) => c.option));
    const sel = selected(a, qid);
    if (sel.length && sel.every((s) => gone.has(s))) out.filter((c) => c.question === qid && !c.partial).forEach((c) => {
      c.emptied = true;
      c.message += `。${num(byId[qid])}没有剩下能用的选项，请回去改一下`;
    });
  }
  // 只提示、不改变筛选的前后矛盾（配置的 warnings）：两道题都答了（且在显示）、条件成立时列出
  for (const w of questionnaire.warnings || []) {
    if (![w.question, w.by_question].every((id) => selected(a, id).length) || !checkCond(w.when, a)) continue;
    out.push({ question: w.question, option: w.option, by_question: w.by_question, by_option: null, partial: false, warning: true, message: w.message });
  }
  return out;
}

// ---------- 引擎 ----------

export function createRuleEngine({ questionnaire, settings = {} }) {
  const Q = questionnaire.questions;
  const byId = Object.fromEntries(Q.map((q) => [q.id, q]));
  const labels = questionnaire.field_labels || {};
  const rankWeights = questionnaire.rank_weights || [3, 2, 1];
  const rankRest = questionnaire.rank_rest ?? 1;

  // 答卷预处理：去掉没显示的题；套用“选了某项就让别的选项失效”的规则
  function prepare(answers) {
    const a = { ...answers };
    for (const q of Q) if (q.show_if && !checkCond(q.show_if, a)) delete a[q.id];
    const disabled = []; // {question, option, unless_project}
    for (const q of Q) {
      for (const opt of q.options || []) {
        if (!selected(a, q.id).includes(opt.id)) continue;
        for (const d of opt.disables || []) for (const o of d.options) disabled.push({ question: d.question, option: o, unless: d.unless_project });
      }
    }
    return { answers: a, disabled };
  }

  // 某个项目看到的答卷（失效的选项按项目条件决定是否去掉）
  // 已选的选项全部失效时，记成一个不对应任何选项的占位值：这道题仍然在筛选，只是没有选项能通过；
  // 不能留空，否则会被当成“没回答”而不筛选（比如预算 0 元、第 5 题只选了新买 VPS，结果变成不限运行位置）
  function answersFor(project, prep) {
    if (!prep.disabled.length) return prep.answers;
    const a = { ...prep.answers };
    for (const d of prep.disabled) {
      if (d.unless && projectMatches(project, d.unless)) continue;
      const before = selected(a, d.question);
      let sel = before.filter((s) => s !== d.option);
      if (before.length && !sel.length) sel = [DISABLED];
      a[d.question] = Array.isArray(prep.answers[d.question]) ? sel : sel[0];
    }
    return a;
  }

  // 一个作用对项目：{ ok, unknown: [字段], applicable }
  function applyEffect(effect, project, answers) {
    if (!effect || !Object.keys(effect).length) return { ok: true, unknown: [], applicable: true };
    if (effect.when && !checkCond(effect.when, answers)) return { ok: true, unknown: [], applicable: false };
    if (effect.unless_project && projectMatches(project, effect.unless_project)) return { ok: true, unknown: [], applicable: true };
    if (effect.any_of) {
      const results = effect.any_of.map((e) => applyEffect(e, project, answers)).filter((r) => r.applicable);
      if (!results.length) return { ok: false, unknown: [], applicable: true, none_applicable: true };
      const pass = results.find((r) => r.ok);
      return pass || { ok: false, unknown: [], applicable: true };
    }
    const unknown = [];
    for (const [field, wanted] of Object.entries(effect.require || {})) {
      if (fieldUnknown(project, field)) { unknown.push(field); continue; }
      if (!intersects(fieldValues(project, field), wanted)) return { ok: false, unknown, applicable: true, field };
    }
    if (effect.require_selected) {
      const r = effect.require_selected;
      const opts = byId[r.question].options.filter((o) => selected(answers, r.question).includes(o.id));
      let wanted = opts.flatMap((o) => (o.values || {})[r.field] || []);
      if (!opts.length) wanted = r.fallback || [];
      wanted = wanted.concat(r.extra || []);
      if (fieldUnknown(project, r.field)) unknown.push(r.field);
      else if (!intersects(fieldValues(project, r.field), wanted)) return { ok: false, unknown, applicable: true, field: r.field };
    }
    for (const [field, bad] of Object.entries(effect.exclude_any || {})) {
      if (intersects(fieldValues(project, field), bad)) return { ok: false, unknown, applicable: true, field };
    }
    for (const [field, bad] of Object.entries(effect.exclude_only || {})) {
      const vals = fieldValues(project, field);
      if (vals.length && vals.every((v) => bad.includes(v))) return { ok: false, unknown, applicable: true, field };
    }
    return { ok: true, unknown, applicable: true };
  }

  // 一道硬条件题对项目：{ ok, unknown, notes }
  function checkQuestion(q, project, answers) {
    const sel = selected(answers, q.id);
    const notes = [];
    let unknown = [];
    // 题目级规则（不看选了哪项，只看条件）
    for (const rule of q.rules || []) {
      const r = applyEffect(rule, project, answers);
      if (!r.ok) return { ok: false, unknown, notes, why: rule.reason };
      unknown = unknown.concat(r.unknown);
      if (r.applicable && rule.note && (!rule.note_if || projectMatches(project, rule.note_if)) && !(rule.note_unless && projectMatches(project, rule.note_unless))) notes.push(rule.note);
    }
    if (!sel.length || q.kind !== "hard") return { ok: true, unknown, notes };
    const opts = q.options.filter((o) => sel.includes(o.id));

    if (q.combine === "union") {
      // 把所选选项的 values 合起来，项目的这个字段要和它有交集
      const field = q.union_field;
      // unless_project 可以写一组条件，或几组条件的数组（满足其中一组即可）
      if (q.unless_project && [].concat(q.unless_project).some((u) => projectMatches(project, u))) return { ok: true, unknown, notes };
      const wanted = opts.flatMap((o) => (o.values || {})[field] || []);
      if (fieldUnknown(project, field)) return { ok: true, unknown: unknown.concat([field]), notes };
      return intersects(fieldValues(project, field), wanted) ? { ok: true, unknown, notes } : { ok: false, unknown, notes };
    }

    if (q.combine === "allow") {
      // 项目需要的每个值，都要在“允许”范围内
      const c = q.constraint;
      let allowed = new Set(c.always_allowed || []);
      for (const o of opts) for (const v of (o.values || {})[c.field] || []) {
        if (!o.values_when || checkCond(o.values_when, answers)) allowed.add(v);
      }
      for (const extra of c.extra_allow || []) {
        if (checkCond(extra.when, answers) && (!extra.when_project || projectMatches(project, extra.when_project))) extra.allow.forEach((v) => allowed.add(v));
      }
      if (fieldUnknown(project, c.field)) return { ok: true, unknown: unknown.concat([c.field]), notes };
      let need = fieldValues(project, c.field);
      for (const h of c.hosting_only || []) {
        if (need.includes(h.value) && !allowed.has(h.value) && projectMatches(project, h.when_project)) {
          need = need.filter((v) => v !== h.value);
          notes.push(h.note);
        }
      }
      const missing = need.filter((v) => !allowed.has(v));
      return missing.length ? { ok: false, unknown, notes, missing } : { ok: true, unknown, notes };
    }

    if (q.constraint && q.constraint.type === "os_match") {
      // 只装在自己电脑上的项目、自带记忆的应用，要支持用户手上设备的系统
      const c = q.constraint;
      const userOs = new Set(opts.flatMap((o) => (o.values || {}).os || []).concat(["any"]));
      const runs = fieldValues(project, "runs_on");
      const applies = project.candidate.category === CATEGORY_APP || (runs.length && runs.every((r) => c.applies_runs_on_only.includes(r)));
      if (!applies) return { ok: true, unknown, notes };
      if (fieldUnknown(project, "os")) return { ok: true, unknown: unknown.concat(["os"]), notes };
      return intersects(fieldValues(project, "os"), [...userOs]) ? { ok: true, unknown, notes } : { ok: false, unknown, notes };
    }

    // 默认 combine = any：满足任意一个所选选项就算通过
    let lastNotice = null;
    for (const o of opts) {
      const r = applyEffect(o.effect, project, answers);
      if (r.ok) return { ok: true, unknown: unknown.concat(r.unknown), notes };
      if (r.none_applicable && o.notice) lastNotice = o.notice;
    }
    return { ok: false, unknown, notes, notice: lastNotice };
  }

  function scoreRules(rules, project, weight, out, source) {
    for (const rule of rules || []) {
      if (rule.when_answers && !checkCond(rule.when_answers, out.answers)) continue;
      if (rule.unless && projectMatches(project, rule.unless)) continue;
      if (!projectMatches(project, rule.if)) continue;
      const pts = rule.points * weight;
      if (!pts) continue;
      out.score += pts;
      if (rule.reason && pts > 0) out.reasons.push({ text: rule.reason, points: pts, source });
      if (rule.reason && pts < 0) out.cautions.push(rule.reason);
    }
  }

  function scoreProject(project, answers) {
    const out = { score: 0, reasons: [], cautions: [], answers };
    for (const q of Q) {
      // 题目级加分规则（硬条件题也可以有）
      for (const r of q.rules || []) if (r.score && checkCond(r.when, answers)) scoreRules(r.score, project, 1, out, q.id);
      if (q.kind !== "preference") continue;
      const sel = selected(answers, q.id);
      sel.forEach((optId, i) => {
        const o = q.options.find((x) => x.id === optId);
        if (!o || !o.effect || !o.effect.score) return;
        const w = q.type === "rank" ? (rankWeights[i] ?? rankRest) : 1;
        scoreRules(o.effect.score, project, w, out, q.id);
      });
    }
    // 推荐偏好：只在用户没有用答案表态时生效
    for (const p of questionnaire.preferences || []) {
      if ((p.overridden_by || []).some((qid) => selected(answers, qid).length)) continue;
      scoreRules([p], project, 1, out, "preference");
    }
    return out;
  }

  // 一次完整筛选：返回 { kept: [...], excluded: [...], notices: Set }
  function filter(answers, projects) {
    const prep = prepare(answers);
    const kept = [], excluded = [], notices = new Set();
    for (const p of projects) {
      if (p.inclusion?.status === "excluded") continue;
      if (p.review_status === "unreviewed" && !settings.recommend_unreviewed) continue;
      const a = answersFor(p, prep);
      let unknown = [], notes = [], fail = null;
      const failedIds = []; // 这个项目没通过的全部题目（排除原因只取第一道；统计“哪道题让选择变少”要看全部）
      for (const q of Q) {
        // 偏好题一般不筛选；它的 rules 里写了排除（不是只加分）时，那几条照样排除
        if (q.kind === "preference" && !(q.rules || []).some((r) => !r.score)) continue;
        const r = checkQuestion(q, p, a);
        if (r.notice) notices.add(r.notice);
        if (!r.ok) {
          failedIds.push(q.id);
          if (!fail) fail = { question: q, detail: r };
          continue;
        }
        unknown = unknown.concat(r.unknown);
        notes = notes.concat(r.notes);
      }
      if (fail) excluded.push({ project: p, question: fail.question, detail: fail.detail, failed: failedIds });
      else kept.push({ project: p, unknown: [...new Set(unknown)], notes: [...new Set(notes)], answers: a });
    }
    return { kept, excluded, notices, answers: prep.answers };
  }

  // 哪几道题让可选项目变少：only = 只因为这一道题被排除的个数（改了这道题就能回来），total = 这道题排除的总数
  function narrowing(run, isMainProject) {
    const stat = {};
    for (const e of run.excluded) {
      if (!isMainProject(e.project)) continue;
      for (const id of e.failed) {
        stat[id] ||= { only: 0, total: 0 };
        stat[id].total++;
        if (e.failed.length === 1) stat[id].only++;
      }
    }
    return Object.entries(stat).map(([id, s]) => {
      const q = byId[id];
      const sel = selected(run.answers, id);
      return { question: id, number: q.number || id.slice(1), short: q.short || q.text,
        selected: sel.map((o) => q.options.find((x) => x.id === o)?.label || o), ...s };
    }).sort((x, y) => y.only - x.only || y.total - x.total);
  }

  function explainExclusion(e) {
    const q = e.question;
    if (e.detail.why) return e.detail.why;
    if (e.detail.missing) return `需要您没勾选的：${e.detail.missing.map((v) => labels[v] || v).join("、")}`;
    return q.exclude_reason || `不符合“${q.short || q.text}”`;
  }

  function present(item) {
    const p = item.project;
    const s = scoreProject(p, item.answers);
    // 硬条件里有“文档没写”的，每项扣一点分，让明确能用的排在前面
    s.score -= item.unknown.length * (questionnaire.result?.unknown_penalty ?? 0);
    const reasons = [];
    for (const r of s.reasons.sort((x, y) => y.points - x.points)) if (!reasons.includes(r.text)) reasons.push(r.text);
    const cautions = [...s.cautions, ...item.notes, ...(p.inclusion?.flags || [])];
    const diff = fieldValues(p, "difficulty")[0];
    if (diff) cautions.push(`上手门槛：${labels["difficulty:" + diff] || diff}`);
    const accounts = fieldValues(p, "accounts_needed").filter((v) => v !== "none");
    const localOk = fieldValues(p, "local_model").includes("yes");
    if (accounts.length) cautions.push(`需要：${accounts.map((v) => (labels[v] || v) + (v === "model_api_key" && localOk ? "，也可以用本地模型代替" : "")).join("、")}`);
    return {
      id: p.id, name: p.name, category: p.candidate.category, repo_url: p.repo_url,
      summary: p.info?.summary?.value || "",
      score: Math.round(s.score * 10) / 10,
      reasons: reasons.slice(0, 3),
      cautions: [...new Set(cautions)],
      unknowns: item.unknown.map((f) => labels[f] || f),
      role: fieldValues(p, "project_role")[0],
      lifecycle_complete: fieldValues(p, "lifecycle_complete")[0] === "complete",
      pairs_with: fieldValues(p, "pairs_with"),
      customization: fieldValues(p, "customization").filter((v) => v !== "not_mentioned").map((v) => labels[v] || v),
    };
  }

  // 搭配方案：最多两个，每个最多 3 个部件。
  // 正在用某套记忆的人：方案一在他现在用的上面补一个，方案二给新方案；
  // 其余的人：方案一是完整系统＋补强，方案二是几个能互相补上环节的项目（不强求凑齐五个环节）
  function buildCombos(results, addons, answers, projects, free) {
    const projById = Object.fromEntries(projects.map((p) => [p.id, p]));
    const memories = results.filter((r) => !["note_connector", "guide", "method"].includes(r.role));
    const pool = memories.slice(0, 15);
    const ALL_STAGES = ["capture", "consolidate", "retrieve", "forget", "review"];
    const stageLabel = { capture: "写入", consolidate: "整理", retrieve: "召回", forget: "遗忘", review: "查看修改" };
    const stagesOf = (id) => ALL_STAGES.filter((s) => (projById[id] ? fieldValues(projById[id], "lifecycle") : []).includes(s));
    const pairsOf = (id) => (projById[id] ? fieldValues(projById[id], "pairs_with") : []);
    const part = (r, extra = {}) => {
      const stages = stagesOf(r.id);
      return { id: r.id, name: r.name, stages, desc: stages.length ? "负责" + stages.map((s) => stageLabel[s]).join("、") : "", ...extra };
    };

    // 第 8 题排第一的问题
    const concernId = [].concat(answers.q8 || [], answers.q8n || []).find((v) => v !== "other" && v !== "no_problem");
    const concernOpt = concernId && ["q8", "q8n"].map((id) => Q.find((q) => q.id === id)?.options.find((o) => o.id === concernId)).find(Boolean);
    const concernRules = (concernOpt?.effect?.score || []).filter((s) => s.points >= 1);
    const fitsConcern = (r) => { const p = projById[r.id]; return concernRules.some((s) => projectMatches(p, s.if) && !(s.unless && projectMatches(p, s.unless))); };
    const concern = (r) => ({ r, via: "concern", label: concernOpt.label });

    // 给一个记忆库补一个：只补真能配合的——作者设计的搭配（按数据里写好的顺序），或用户需要的补充部件（情绪引擎、上下文延续工具）。
    // 两个独立的记忆库各存各的，一个的遗忘、整理碰不到另一个的记忆，按环节拼起来并不成立，所以不这样补
    const addonItems = Object.values(addons).flatMap((a) => a.items);
    function companionFor(baseIds, exclude) {
      const allCand = memories.filter((r) => !exclude.has(r.id));
      const byCandId = Object.fromEntries(allCand.map((r) => [r.id, r]));
      const pid = baseIds.flatMap(pairsOf).find((id) => byCandId[id])
        || allCand.find((r) => baseIds.some((id) => pairsOf(r.id).includes(id)))?.id;
      if (pid) return { r: byCandId[pid], via: "pairs" };
      const ext = addonItems.find((x) => !exclude.has(x.id));
      return ext ? { r: ext, via: "addon", label: ext.addon_title } : null;
    }

    // 第 7 题：用户现在用的是什么。填了项目名的按名字对上收录的项目
    function currentSetup() {
      const used = [].concat(answers.q6 || []);
      const text = used.includes("open_source") ? free["q6.open_source"] || "" : "";
      if (text) {
        const norm = (s) => String(s).toLowerCase().replace(/[\s\-_·.]/g, "");
        const GENERIC = new Set(["memory", "memories", "context", "recall", "remember"]);
        // 按顿号、逗号等拆开逐个对；短名字只认完全一样的，免得 memo 认成 memory 的一部分
        const tokens = text.split(/[，,、；;／/\n]+/).map(norm).filter(Boolean);
        const hit = (k) => k.length >= 3 && !GENERIC.has(k) && tokens.some((t) => t === k || (k.length >= 6 && t.includes(k)));
        const hits = projects.filter((p) => [p.id, String(p.name).split("（")[0]].map(norm).some(hit));
        const rank = (p) => { const i = results.findIndex((r) => r.id === p.id); return i < 0 ? Infinity : i; };
        const seen = new Set(), ids = [];
        for (const p of hits.sort((a, b) => rank(a) - rank(b))) {
          const main = norm(String(p.name).split("（")[0]);
          if (!seen.has(main)) { seen.add(main); ids.push(p.id); }
        }
        if (ids.length) return { base: "project", ids: ids.slice(0, 2) };
      }
      if (used.includes("notes")) return { base: "notes" };
      if (used.includes("native")) return { base: "native" };
      return null;
    }

    function currentPlan(cur) {
      if (cur.base === "project") {
        const c = companionFor(cur.ids, new Set(cur.ids));
        if (!c) return null;
        return { type: "current", base: "project", title: "在您现在用的基础上改进", via: c.via, label: c.label,
          parts: [...cur.ids.map((id) => part(projById[id], { current: true })), part(c.r)] };
      }
      const md = cur.base === "notes" && pool.find((r) => projectMatches(projById[r.id], { human_review: ["files"], export: ["markdown"] }));
      const c = md ? { r: md, via: "markdown" } : (concernRules.length && pool.find(fitsConcern) ? concern(pool.find(fitsConcern)) : (pool[0] && { r: pool[0], via: "top" }));
      if (!c) return null;
      const baseName = cur.base === "notes" ? "您的笔记库" : "客户端自带的记忆";
      return { type: "current", base: cur.base, title: "在您现在用的基础上改进", via: c.via, label: c.label,
        parts: [{ id: null, name: baseName, stages: [], desc: "", current: true }, part(c.r)] };
    }

    function completePlan() {
      const complete = memories.filter((r) => r.role === "full_memory" || r.role === "companion_app").slice(0, 10).find((r) => r.lifecycle_complete);
      if (!complete) return null;
      const c = companionFor([complete.id], new Set([complete.id]));
      return c && { type: "complete", title: "完整系统＋专项补强", via: c.via, label: c.label, parts: [part(complete), part(c.r)] };
    }

    // 方案二：作者设计的一组（都不完整的），或一个记忆库加上用户需要的补充部件（每类一个，最多两个）
    function groupPlan(avoid) {
      const cand = pool.filter((r) => !r.lifecycle_complete && r.role !== "context_tool" && r.role !== "state_engine");
      for (const r of cand) {
        const mates = memories.filter((o) => o.id !== r.id && !o.lifecycle_complete && (pairsOf(r.id).includes(o.id) || pairsOf(o.id).includes(r.id))).slice(0, 2);
        if (mates.length) return { type: "group", title: "几个项目互相配合", via: "pairs", parts: [r, ...mates].map((x) => part(x)) };
      }
      const tools = Object.values(addons).map((a) => a.items[0]).filter(Boolean).slice(0, 2);
      const libs = memories.filter((r) => ["full_memory", "companion_app", "memory_component"].includes(r.role));
      const lib = libs.find((r) => !avoid.has(r.id)) || libs[0];
      if (!lib || !tools.length) return null;
      return { type: "group", title: "记忆库加补充部件", via: "roles", parts: [part(lib), ...tools.map((x) => part(x))] };
    }

    // 最多两个方案；只有一个时照样给（页面上不编号、不写对比）。两个方案尽量不重复用同一个推荐项目
    const key = (c) => c.parts.map((p) => p.id).sort().join(",");
    const cur = currentSetup();
    const curPlan = cur && currentPlan(cur);
    const first = curPlan || completePlan();
    const avoid = new Set((first?.parts || []).filter((p) => p.id && !p.current).map((p) => p.id));
    const rest = (curPlan ? [completePlan(), groupPlan(avoid)] : [groupPlan(avoid)]).filter((c) => c && (!first || key(c) !== key(first)));
    if (!first) return rest.slice(0, 1);
    const used = new Set(first.parts.filter((p) => p.id && !p.current).map((p) => p.id));
    const second = rest.find((c) => !c.parts.some((p) => used.has(p.id))) || rest[0];
    return second ? [first, second] : [first];
  }

  // ---------- 对外接口 ----------
  function recommend(answers, projects, options = {}) {
    const run = filter(answers, projects);
    const scored = run.kept.map(present).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
    const topN = questionnaire.result?.top_n || 8;
    const NOT_MAIN = ["context_tool", "state_engine", "guide", "note_connector"];
    const isMain = (r) => !NOT_MAIN.includes(r.role);
    // 做法（笔记软件当记忆）和记忆库一起排名；笔记软件连接器不单独排名，挂在做法下面作为可选工具：
    // 列出全部通过筛选的，按 pairs_with 的顺序（数据里按笔记软件排好，Obsidian 在前），不按分数
    const connectors = Object.fromEntries(scored.filter((r) => r.role === "note_connector").map((c) => [c.id, c]));
    const results = scored.filter(isMain)
      .map((r) => (r.role === "method" ? { ...r, parts: r.pairs_with.map((id) => connectors[id]).filter(Boolean) } : r));

    const addons = {};
    for (const ad of questionnaire.addons || []) {
      if (!checkCond(ad.when, run.answers)) continue;
      const items = scored.filter((r) => projectMatches(projects.find((p) => p.id === r.id), ad.require)).slice(0, ad.pick || 2);
      if (items.length) addons[ad.id] = { title: ad.title, why: ad.why, items: items.map((x) => ({ ...x, addon_title: ad.title })) };
    }
    const guides = scored.filter((r) => r.role === "guide").slice(0, 3);

    // 结果太少时，试着放宽每道硬条件题，看能多出几个；单独放宽哪一条都不够时，再试两条一起放宽
    const relax = [];
    if (results.length < (questionnaire.result?.min_results || 3)) {
      const steps = [];
      for (const q of Q) {
        for (const step of q.relax || []) {
          const v = step.set !== undefined ? step.set : [...new Set([...selected(answers, q.id), ...(step.add || [])])];
          if (JSON.stringify(v) !== JSON.stringify(answers[q.id])) steps.push({ question: q.id, label: step.label, value: v });
        }
      }
      const count = (list) => {
        const a = { ...answers };
        for (const s of list) a[s.question] = s.value;
        return filter(a, projects).kept.filter((k) => isMain(present(k))).length;
      };
      for (const s of steps) {
        const n = count([s]);
        if (n > results.length) relax.push({ question: s.question, label: s.label, count: n });
      }
      // 单独放宽哪一条都不够（或放宽后仍少于 min_results 个）时，再试两条一起放宽，只列比单条更多的组合
      const bestSingle = Math.max(results.length, ...relax.map((x) => x.count));
      if (bestSingle < (questionnaire.result?.min_results || 3)) {
        for (let i = 0; i < steps.length; i++) {
          for (let j = i + 1; j < steps.length; j++) {
            if (steps[i].question === steps[j].question) continue;
            const n = count([steps[i], steps[j]]);
            if (n > bestSingle) relax.push({ question: `${steps[i].question}+${steps[j].question}`, label: `${steps[i].label}，同时${steps[j].label}`, count: n });
          }
        }
      }
      // 单条放宽只改一处，比两条组合容易做到，先列单条
      const combo = (x) => (x.question.includes("+") ? 1 : 0);
      relax.sort((x, y) => combo(x) - combo(y) || y.count - x.count);
      relax.splice(6);
    }

    return {
      engine: "rule",
      results: results.slice(0, topN),
      more: results.slice(topN),
      total_kept: results.length,
      addons,
      guides,
      combos: buildCombos(scored, addons, answers, projects, options.free || {}),
      excluded: run.excluded.map((e) => ({ id: e.project.id, name: e.project.name, reason: explainExclusion(e) })),
      notices: [...run.notices],
      relax,
      narrowed_by: narrowing(run, (p) => !NOT_MAIN.includes(fieldValues(p, "project_role")[0])),
      conflicts: findConflicts(questionnaire, answers),
    };
  }

  return { name: "rule", recommend };
}
