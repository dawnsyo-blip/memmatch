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
  const base = { q1: ["anthropic"], q2: ["iphone", "mac"], q3: ["mcp_client"], q4: "single", q5: ["computer"], q16: "high", q17: ["api_key"], q18: "more" };
  const a = real.recommend(base, all);
  const b = real.recommend({ ...base, q3a: ["openclaw"] }, all); // 第 3 题没选遥控或程序化，第 3a 题不显示
  assert.deepEqual(a.results.map((x) => x.id), b.results.map((x) => x.id));
});
