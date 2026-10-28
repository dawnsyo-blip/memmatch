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

test("正式问卷：没显示的题（第 3a 题）不影响结果", () => {
  const { projects: all, engine: real } = loadAll();
  const base = { q2: ["anthropic"], q1: ["iphone", "mac"], q3: ["mcp_client"], q4: "single", q5: ["computer"], q16: "high", q17: ["api_key"], q18: "more" };
  const a = real.recommend(base, all);
  const b = real.recommend({ ...base, q3a: ["openclaw"] }, all); // 第 3 题没选遥控或程序化，第 3a 题不显示
  assert.deepEqual(a.results.map((x) => x.id), b.results.map((x) => x.id));
});

// 遥控电脑上的 Claude Code、多端共用，门槛和预算都放开
const multiBase = { q2: ["anthropic"], q1: ["iphone", "mac"], q3: ["remote_control"], q3a: ["claude_code"], q4: "same_agent", q5: ["computer"], q16: "high", q17: ["api_key"], q18: "more" };
const has = (p, field, v) => [].concat(p.normalized[field].value).includes(v);

test("第 4 题：要各 Agent 分开记忆时，能分开的排在前面", () => {
  const { projects: all, engine: real } = loadAll();
  const byId = Object.fromEntries(all.map((p) => [p.id, p]));
  const r = real.recommend({ ...multiBase, q4: "per_agent" }, all);
  const top = r.results.slice(0, 5).map((x) => byId[x.id]);
  assert.ok(top.filter((p) => has(p, "multi_agent", "per_agent")).length >= 4, "前 5 名大多应能按 Agent 分开记忆");
});

test("第 9 题：要找回原图时，能存原图的项目靠前；不需要时不影响结果", () => {
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

test("第 7 题（q6）选“连接笔记类软件”：存成 Markdown 文件的记忆库加 2 分，做法本身不加", () => {
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
