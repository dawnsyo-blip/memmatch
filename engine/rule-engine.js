// 规则推荐引擎：读取问卷配置（data/questionnaire/questions.json），对项目做硬条件筛选、偏好打分、生成理由。
// 代码里不写死任何题目；题目、选项和每个选项的作用都来自配置，格式见 docs/questionnaire-format.md。
// 浏览器和 Node 都能运行（纯 ES 模块，没有依赖）。

const CATEGORY_APP = "自带记忆的应用";

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
  function answersFor(project, prep) {
    if (!prep.disabled.length) return prep.answers;
    const a = { ...prep.answers };
    for (const d of prep.disabled) {
      if (d.unless && projectMatches(project, d.unless)) continue;
      const sel = selected(a, d.question).filter((s) => s !== d.option);
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
      if (r.applicable && rule.note && (!rule.note_if || projectMatches(project, rule.note_if))) notes.push(rule.note);
    }
    if (!sel.length || q.kind !== "hard") return { ok: true, unknown, notes };
    const opts = q.options.filter((o) => sel.includes(o.id));

    if (q.combine === "union") {
      // 把所选选项的 values 合起来，项目的这个字段要和它有交集
      const field = q.union_field;
      if (q.unless_project && projectMatches(project, q.unless_project)) return { ok: true, unknown, notes };
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
      for (const q of Q) {
        if (q.kind === "preference") continue;
        const r = checkQuestion(q, p, a);
        if (r.notice) notices.add(r.notice);
        if (!r.ok) { fail = { question: q, detail: r }; break; }
        unknown = unknown.concat(r.unknown);
        notes = notes.concat(r.notes);
      }
      if (fail) excluded.push({ project: p, question: fail.question, detail: fail.detail });
      else kept.push({ project: p, unknown: [...new Set(unknown)], notes: [...new Set(notes)], answers: a });
    }
    return { kept, excluded, notices, answers: prep.answers };
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
    if (accounts.length) cautions.push(`需要：${accounts.map((v) => (labels[v] || v) + (v === "model_api_key" && localOk ? "（也可以用本地模型代替）" : "")).join("、")}`);
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

  // results 是全部通过筛选的项目（已排序）；搭档可以排在后面，但主项目只看前 10 名
  function buildCombos(results, addons) {
    const combos = [];
    const main = results.filter((r) => r.role === "full_memory" || r.role === "companion_app");
    const complete = main.slice(0, 10).find((r) => r.lifecycle_complete);
    if (complete) combos.push({ title: "一个项目覆盖写入、整理、召回、遗忘、查看修改全流程", parts: [{ role: "完整记忆系统", id: complete.id, name: complete.name }] });
    const byId = Object.fromEntries(results.map((r) => [r.id, r]));
    for (const r of results.slice(0, 10)) {
      for (const pid of r.pairs_with) {
        if (byId[pid] && !combos.some((c) => c.parts.some((x) => x.id === pid) && c.parts.some((x) => x.id === r.id))) {
          combos.push({ title: "设计上就是搭配使用的组合", parts: [{ role: "主记忆", id: r.id, name: r.name }, { role: "搭配", id: pid, name: byId[pid].name }] });
        }
      }
    }
    const extras = Object.values(addons).map((a) => a.items[0]).filter(Boolean);
    if (main[0] && extras.length) {
      combos.push({ title: "记忆库＋补充部件", parts: [{ role: "记忆库", id: main[0].id, name: main[0].name }, ...extras.map((x) => ({ role: x.addon_title, id: x.id, name: x.name }))] });
    }
    return combos;
  }

  // ---------- 对外接口 ----------
  function recommend(answers, projects) {
    const run = filter(answers, projects);
    const scored = run.kept.map(present).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
    const topN = questionnaire.result?.top_n || 8;
    const isMain = (r) => !["context_tool", "state_engine", "guide"].includes(r.role);
    const results = scored.filter(isMain);

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
      if (!relax.length) {
        for (let i = 0; i < steps.length; i++) {
          for (let j = i + 1; j < steps.length; j++) {
            if (steps[i].question === steps[j].question) continue;
            const n = count([steps[i], steps[j]]);
            if (n > results.length) relax.push({ question: `${steps[i].question}+${steps[j].question}`, label: `${steps[i].label}，同时${steps[j].label}`, count: n });
          }
        }
      }
      relax.sort((x, y) => y.count - x.count);
      relax.splice(6);
    }

    return {
      engine: "rule",
      results: results.slice(0, topN),
      total_kept: results.length,
      addons,
      guides,
      combos: buildCombos(scored, addons),
      excluded: run.excluded.map((e) => ({ id: e.project.id, name: e.project.name, reason: explainExclusion(e) })),
      notices: [...run.notices],
      relax,
    };
  }

  return { name: "rule", recommend };
}
