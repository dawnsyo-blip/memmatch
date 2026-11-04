// 引擎本身的测试：换一份问卷也能跑（代码里没有写死题目），跨题规则按配置生效。
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRuleEngine } from "../engine/index.js";
import { loadAll } from "../engine/load-node.js";

const P = (id, normalized, category = "可接入已有助手") => ({
  id, name: id, candidate: { category }, inclusion: { status: "included", flags: [] }, review_status: "reviewed",
  normalized: Object.fromEntries(Object.entries(normalized).map(([k, v]) => [k, { value: v, status: "auto", basis: "" }])),
});

const mini = {
  questions: [
    { id: "where", kind: "hard", type: "multi", combine: "union", union_field: "runs_on", options: [
      { id: "pc", label: "电脑", values: { runs_on: ["own_computer"] } },
      { id: "vps", label: "新买 VPS", values: { runs_on: ["own_server"] } }] },
    { id: "money", kind: "hard", type: "single", options: [
      { id: "zero", label: "0 元", effect: { require: { cost: ["free"] } }, disables: [{ question: "where", options: ["vps"] }] },
      { id: "any", label: "都行", effect: {} }] },
    { id: "taste", kind: "preference", type: "single", options: [
      { id: "review", label: "先审核", effect: { score: [{ if: { write_mode: ["review_first"] }, points: 2, reason: "先审核" }] } }] },
  ],
};
const projects = [
  P("a", { runs_on: ["own_computer"], cost: "free", write_mode: ["auto"] }),
  P("b", { runs_on: ["own_server"], cost: "free", write_mode: ["review_first"] }),
  P("c", { runs_on: ["own_computer"], cost: "free", write_mode: ["review_first"] }),
  P("d", { runs_on: ["own_computer"], cost: "paid_service", write_mode: ["review_first"] }),
];
const engine = createRuleEngine({ questionnaire: mini });

test("换一份完全不同的问卷也能跑", () => {
  const r = engine.recommend({ where: ["pc", "vps"], money: "any", taste: "review" }, projects);
  assert.deepEqual(r.results.map((x) => x.id).sort(), ["a", "b", "c", "d"]);
  assert.equal(r.results[r.results.length - 1].id, "a", "没有先审核的应该排最后");
  assert.deepEqual(r.results[0].reasons, ["先审核"]);
});

test("预算 0 元时，“新买 VPS”失效，只装在服务器上的项目被排除", () => {
  const r = engine.recommend({ where: ["pc", "vps"], money: "zero" }, projects);
  assert.deepEqual(r.results.map((x) => x.id).sort(), ["a", "c"]);
  assert.ok(r.excluded.some((e) => e.id === "b"));
  assert.ok(r.excluded.some((e) => e.id === "d"));
});

test("失效的选项是那道题唯一的回答时，这道题照样筛选，并提示前后矛盾", () => {
  const r = engine.recommend({ where: ["vps"], money: "zero" }, projects);
  assert.deepEqual(r.results, [], "运行位置只剩失效的“新买 VPS”，不该变成不限运行位置");
  assert.equal(r.conflicts.length, 1);
  assert.ok(r.conflicts[0].emptied && r.conflicts[0].question === "where" && r.conflicts[0].by_option === "zero");
  assert.ok(r.relax.length === 0 || r.relax.every((x) => x.count > 0));
  assert.deepEqual(engine.recommend({ where: ["pc", "vps"], money: "zero" }, projects).conflicts.map((c) => c.emptied), [undefined]);
});

test("narrowed_by：只因为某一道题被排除的个数", () => {
  const r = engine.recommend({ where: ["pc"], money: "zero" }, projects);
  const by = Object.fromEntries(r.narrowed_by.map((x) => [x.question, x]));
  assert.deepEqual([by.where.only, by.where.total], [1, 1], "b 免费，只因为装在服务器上被排除");
  assert.deepEqual([by.money.only, by.money.total], [1, 1], "d 只因为收费被排除");
  assert.deepEqual(by.money.selected, ["0 元"]);
});

test("文档没写的字段不排除，只标“需自行确认”并略微靠后", () => {
  const unknownCost = { ...P("e", { runs_on: ["own_computer"], write_mode: ["review_first"] }) };
  unknownCost.normalized.cost = { value: null, status: "unknown", basis: "" };
  const eng = createRuleEngine({ questionnaire: { ...mini, field_labels: { cost: "费用" }, result: { unknown_penalty: 1 } } });
  const r = eng.recommend({ where: ["pc"], money: "zero", taste: "review" }, [...projects, unknownCost]);
  const e = r.results.find((x) => x.id === "e");
  assert.ok(e, "费用没写的项目不该被排除");
  assert.deepEqual(e.unknowns, ["费用"]);
  assert.ok(r.results.findIndex((x) => x.id === "c") < r.results.findIndex((x) => x.id === "e"));
});

test("正式问卷：没显示的题（第 2j 题）不影响结果", () => {
  const { projects: all, engine: real } = loadAll();
  const base = { q1: ["iphone", "mac"], q3: ["client"], q3client: ["kelivo"], q4: "single", q5: ["computer"], q16: "high", q18c: "model_fees" };
  const a = real.recommend(base, all);
  const b = real.recommend({ ...base, q3runtime: ["openclaw"] }, all); // 第 2 题没选消息平台，第 2j 题不显示
  assert.deepEqual(a.results.map((x) => x.id), b.results.map((x) => x.id));
});

// 遥控电脑上的 Claude Code、多端共用，门槛和预算都放开
const multiBase = { q1: ["iphone", "mac"], q3: ["remote"], q3remote: ["claude_code"], q4: "same_agent", q5: ["computer"], q16: "high", q18c: "model_fees" };
const has = (p, field, v) => [].concat(p.normalized[field].value).includes(v);

test("第 3 题（q4）：要各 Agent 分开记忆时，能分开的排在前面", () => {
  const { projects: all, engine: real } = loadAll();
  const byId = Object.fromEntries(all.map((p) => [p.id, p]));
  const r = real.recommend({ ...multiBase, q4: "per_agent" }, all);
  const top = r.results.slice(0, 5).map((x) => byId[x.id]);
  assert.ok(top.filter((p) => has(p, "multi_agent", "per_agent")).length >= 4, "前 5 名大多应能按 Agent 分开记忆");
});

test("第 8 题（q9）：要找回原图时，能存原图的项目靠前；不需要时不影响结果", () => {
  const { projects: all, engine: real } = loadAll();
  const byId = Object.fromEntries(all.map((p) => [p.id, p]));
  const r = real.recommend({ ...multiBase, q9: ["image"] }, all);
  const top = r.results.slice(0, 3).map((x) => byId[x.id]);
  assert.ok(top.every((p) => has(p, "media_recall", "image")), "前 3 名应都能存原图");
  assert.deepEqual(real.recommend({ ...multiBase, q9: ["none"] }, all).results.map((x) => x.id),
    real.recommend(multiBase, all).results.map((x) => x.id));
});

test("笔记软件当记忆：做法和记忆库一起排名，连接器只挂在做法下面，不单独出现", () => {
  const { projects: all, questionnaire, settings } = loadAll();
  const wide = createRuleEngine({ questionnaire: { ...questionnaire, result: { ...questionnaire.result, top_n: 999 } }, settings });
  const role = Object.fromEntries(all.map((p) => [p.id, [].concat(p.normalized.project_role.value)[0]]));
  const r = wide.recommend(multiBase, all);
  const shown = [...r.results, ...r.guides, ...Object.values(r.addons).flatMap((a) => a.items), ...r.combos.flatMap((c) => c.parts)];
  assert.ok(shown.every((x) => role[x.id] !== "note_connector"), "连接器不应单独出现");
  const m = r.results.find((x) => x.id === "method-note-vault");
  assert.ok(m, "遥控电脑上的 Claude Code 应能在排名里看到“笔记库当记忆”");
  assert.ok(m.parts.length && m.parts.every((x) => role[x.id] === "note_connector"), "做法下面应挂着可选的连接器");
  const order = all.find((p) => p.id === "method-note-vault").normalized.pairs_with.value;
  assert.deepEqual(m.parts.map((x) => x.id), order.filter((id) => m.parts.some((x) => x.id === id)), "连接器应按数据里的顺序列出，不按分数");
  assert.ok(m.parts[0].id.includes("obsidian"), "Obsidian 的连接器应排在最前");
  assert.ok(r.results.indexOf(m) >= 8, "自动化程度低，不应排进前 8");
});

test("第 6 题（q6）选“连接笔记类软件”：存成 Markdown 文件的记忆库加 2 分，做法本身不加", () => {
  const { projects: all, questionnaire, settings } = loadAll();
  const wide = createRuleEngine({ questionnaire: { ...questionnaire, result: { ...questionnaire.result, top_n: 999 } }, settings });
  const byId = Object.fromEntries(all.map((p) => [p.id, p]));
  const md = (id) => has(byId[id], "human_review", "files") && has(byId[id], "export", "markdown") && !has(byId[id], "project_role", "method");
  const scoreOf = (r) => Object.fromEntries(r.results.map((x) => [x.id, x.score]));
  const a = scoreOf(wide.recommend({ ...multiBase, q6: "open_source" }, all)), b = scoreOf(wide.recommend({ ...multiBase, q6: "notes" }, all));
  let bumped = 0;
  for (const id of Object.keys(a)) {
    assert.equal(b[id], a[id] + (md(id) ? 2 : 0), `${id} 分数不对`);
    if (md(id)) bumped++;
  }
  assert.ok(bumped >= 3, "应有几个存成 Markdown 文件的记忆库被加分");
  assert.equal(b["method-note-vault"], a["method-note-vault"], "做法本身不应加分");
});

test("第 11 题（q12m）选“完全不想管”：笔记软件当记忆的做法被排除，原因记在这道题上", () => {
  const { projects: all, questionnaire, settings } = loadAll();
  const real = createRuleEngine({ questionnaire: { ...questionnaire, result: { ...questionnaire.result, top_n: 999 } }, settings });
  const r = real.recommend({ ...multiBase, q12m: "none" }, all);
  assert.ok(!r.results.some((x) => x.id.startsWith("method-")), "不想维护的人不该看到笔记做法");
  const e = r.excluded.find((x) => x.id === "method-note-vault");
  assert.ok(e && e.reason.includes("自己按规则维护"), `排除原因应来自第 11 题：${e?.reason}`);
  assert.ok(real.recommend({ ...multiBase, q12m: "light" }, all).results.some((x) => x.id === "method-note-vault"), "偶尔检查的照常排名");
});

test("只提示的前后矛盾（warnings）：本地 LLM 却没有电脑，远程连接却要“点几下”", async () => {
  const { questionnaire } = loadAll();
  const { findConflicts } = await import("../engine/index.js");
  const local = { q3: ["client"], q3api: ["local"] };
  assert.deepEqual(findConflicts(questionnaire, { ...local, q1: ["iphone"] }).map((c) => c.question), ["q3api"]);
  assert.deepEqual(findConflicts(questionnaire, { ...local, q1: ["iphone", "mac"] }), [], "有电脑时不提示");
  assert.deepEqual(findConflicts(questionnaire, { ...local, q1: ["iphone"], q3api: ["local", "cn"] }), [], "还用别家模型时不提示");
  assert.deepEqual(findConflicts(questionnaire, { q3: ["remote"], q16: "low" }).map((c) => c.question), ["q16"]);
  assert.deepEqual(findConflicts(questionnaire, { q3: ["remote", "client"], q4: "single" }).map((c) => c.question), ["q4"], "几种使用方式却只在一个入口用");
});

test("token 用量题（q18t）：越省越好时“不随记忆变多”的加分、每轮都调用大模型的减分，可设上限的带提醒", () => {
  const { projects: all, questionnaire, settings } = loadAll();
  const wide = createRuleEngine({ questionnaire: { ...questionnaire, result: { ...questionnaire.result, top_n: 999 } }, settings });
  const byId = Object.fromEntries(all.map((p) => [p.id, p]));
  const val = (id, f) => byId[id].normalized[f].value;
  const pick = (r) => Object.fromEntries(r.results.map((x) => [x.id, x]));
  const a = pick(wide.recommend({ ...multiBase, q18t: "any" }, all)), b = pick(wide.recommend({ ...multiBase, q18t: "thrifty" }, all));
  let up = 0, down = 0;
  for (const id of Object.keys(a)) {
    const exp = (val(id, "token_inject") === "bounded" ? 1.5 : val(id, "token_inject") === "grows" ? -3 : 0)
      + ({ none: 1, scheduled: -0.5, per_message: -2 }[val(id, "token_background")] || 0);
    assert.ok(Math.abs(b[id].score - a[id].score - exp) < 0.11, `${id} 分数变化应为 ${exp}`);
    if (exp > 0) up++; if (exp < 0) down++;
  }
  assert.ok(up > 10 && down > 3, `加分 ${up} 个、减分 ${down} 个，太少`);
  assert.ok(b["ombre-brain"].cautions.some((c) => c.includes("先设好上限")), "可设上限的项目要提醒");
  assert.ok(!a["ombre-brain"].cautions.some((c) => c.includes("先设好上限")), "不在意用量时不提醒");
});

test("搭配方案按使用方式排除装不到一起的：最多一个转发服务、一个自带聊天界面的应用，聊天软件插件只和同一宿主的搭", () => {
  const { projects: all, engine: real, questionnaire } = loadAll();
  const byId = Object.fromEntries(all.map((p) => [p.id, p]));
  const HOSTS = ["sillytavern", "astrbot", "open_webui", "rikkahub", "kelivo"];
  let seed = 11; const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const pick = (a) => a[Math.floor(rand() * a.length)];
  let checked = 0;
  for (let i = 0; i < 150; i++) {
    const a = {};
    for (const q of questionnaire.questions) {
      if (q.type === "single") { a[q.id] = pick(q.options).id; continue; }
      a[q.id] = q.options.filter((o) => !o.exclusive).sort(() => rand() - 0.5).slice(0, 1 + Math.floor(rand() * 3)).map((o) => o.id);
    }
    for (const c of real.recommend(a, all).combos || []) {
      if (c.via === "pairs") continue;
      const ids = c.parts.filter((p) => p.id).map((p) => p.id);
      const main = ids.map((id) => byId[id].normalized.usage_form.value[0]);
      const n = (f) => main.filter((x) => x === f).length;
      assert.ok(n("proxy") <= 1 && n("chat_app") <= 1, `两个转发服务或两个聊天应用：${ids}`);
      assert.ok(!(n("plugin_chat") && (n("chat_app") || n("plugin_agent"))), `聊天软件插件接不上：${ids}`);
      const hosts = ids.filter((_, j) => main[j] === "plugin_chat").map((id) => [].concat(byId[id].normalized.compatible_clients.value).filter((x) => HOSTS.includes(x)));
      for (let j = 1; j < hosts.length; j++) assert.ok(hosts[j].some((x) => hosts[0].includes(x)), `宿主不同的聊天软件插件：${ids}`);
      checked++;
    }
  }
  assert.ok(checked > 30, `检查的方案太少：${checked}`);
});

test("组合方案按挂载位置：部件都接在用户的同一个工具上，最多一个转发服务、一个占插槽的插件，都写了怎么接", () => {
  const { projects: all, engine: real, questionnaire } = loadAll();
  const byId = Object.fromEntries(all.map((p) => [p.id, p]));
  const slotOf = (id) => [].concat(byId[id].normalized.host_memory.value).filter((v) => /:(replaces|mixed)$/.test(v));
  let seed = 5; const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const pick = (a) => a[Math.floor(rand() * a.length)];
  let checked = 0;
  for (let i = 0; i < 300; i++) {
    const a = {};
    for (const q of questionnaire.questions) {
      if (q.type === "single") { a[q.id] = pick(q.options).id; continue; }
      a[q.id] = q.options.filter((o) => !o.exclusive).sort(() => rand() - 0.5).slice(0, 1 + Math.floor(rand() * 2)).map((o) => o.id);
    }
    a.q16 = "high"; a.q5 = ["computer", "server"];
    for (const c of real.recommend(a, all).combos) {
      if (!c.client) continue;
      const parts = c.parts.filter((p) => p.id);
      assert.ok(parts.every((p) => p.how), `${c.title} 有部件没写怎么接：${parts.map((p) => p.id)}`);
      if (c.via !== "pairs") {
        assert.ok(parts.filter((p) => p.how.includes("接口地址")).length <= 1, `两个转发服务：${parts.map((p) => p.id)}`);
        assert.ok(parts.filter((p) => p.how.includes("插槽") && slotOf(p.id).length).length <= 1, `两个占记忆插槽的插件：${parts.map((p) => p.id)}`);
      }
      checked++;
    }
  }
  assert.ok(checked > 50, `检查的方案太少：${checked}`);
});

test("在用 OpenClaw 自带记忆时，“在现有基础上改进”不补会替换它的项目，并写明补在哪份记忆上", () => {
  const { projects: all, engine: real } = loadAll();
  const byId = Object.fromEntries(all.map((p) => [p.id, p]));
  const base = { q1: ["windows", "vps"], q3: ["bot"], q3bot: ["runtime"], q3runtime: ["openclaw"], q3api: ["cn"], q4: "single",
    q5: ["server", "computer"], q16: "high", q18c: "model_fees", q6: ["native"] };
  let seen = 0;
  for (const q7 of [["companion"], ["roleplay"], ["work"], ["coding"]]) for (const q10 of ["auto", "auto_review", "review_first"]) {
    const plan = real.recommend({ ...base, q7, q10 }, all).combos.find((c) => c.type === "current");
    if (!plan) continue;
    seen++;
    assert.match(plan.parts[0].name, /OpenClaw 自带的 memory-core/);
    for (const p of plan.parts.filter((x) => x.id))
      assert.ok(![].concat(byId[p.id].normalized.host_memory.value).some((v) => /^openclaw:(replaces|mixed)$/.test(v)), `${p.id} 会替换 OpenClaw 自带的记忆`);
  }
  assert.ok(seen >= 6);
});

test("推荐结果写明在用户的工具里怎么接", () => {
  const { projects: all, engine: real } = loadAll();
  const r = real.recommend({ q1: ["android", "vps"], q3: ["client"], q3client: ["kelivo"], q3api: ["cn"], q4: "single", q5: ["server"], q16: "high", q18c: "model_fees" }, all);
  const all8 = [...r.results, ...r.more];
  assert.equal(all8.find((x) => x.id === "kiwi-mem")?.how, "把 Kelivo 的接口地址改成它");
  assert.ok(all8.every((x) => x.how), "每个推荐都应写明怎么接");
  const oc = real.recommend({ q1: ["windows"], q3: ["bot"], q3bot: ["runtime"], q3runtime: ["openclaw"], q4: "single", q5: ["computer"], q16: "high", q18c: "model_fees" }, all);
  assert.equal([...oc.results, ...oc.more].find((x) => x.id === "memory-lancedb-pro")?.how, "装成 OpenClaw 的插件，占用它的记忆插槽");
});
