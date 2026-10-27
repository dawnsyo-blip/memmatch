// 阶段 4 自动测试：每个虚构用户的期望（见 personas.mjs 的 expect）写成断言。
// 运行：npm test（或 node --test tests/）
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadAll } from "../engine/load-node.js";
import { PERSONAS, answersOf } from "./personas.mjs";

const { projects, engine } = loadAll();
const byId = Object.fromEntries(projects.map((p) => [p.id, p]));
const run = (id) => engine.recommend(answersOf(PERSONAS.find((p) => p.id === id)), projects);
const vals = (id, f) => [].concat(byId[id].normalized[f].value ?? []);
const ids = (list) => list.map((x) => x.id);
const allKept = (r) => [...r.results, ...Object.values(r.addons).flatMap((a) => a.items), ...r.guides];

test("只用 Claude App、只想点几下：结果为空，给出放宽建议", () => {
  const r = run("claude_app_lazy");
  assert.equal(r.total_kept, 0);
  assert.ok(r.relax.some((x) => x.label.includes("照着教程")), "应建议放宽安装门槛");
});

test("只用 Claude App、能照教程操作、没勾 GitHub：不推荐要用电脑部署的，放宽建议里有 GitHub", () => {
  const r = run("claude_app_tutorial");
  assert.ok(!ids(r.results).includes("memheaven"), "MemHeaven 要在电脑上部署");
  assert.ok(r.relax.some((x) => x.label.includes("GitHub")));
});

test("只用 Claude App、能照教程操作、有 GitHub：推荐能被 Claude App 远程连上的记忆库", () => {
  const r = run("claude_app_github");
  assert.ok(ids(r.results).includes("aelios"));
  for (const x of r.results) {
    const ok = vals(x.id, "compatible_clients").includes("claude_web_mobile") || vals(x.id, "phone_access").includes("remote_mcp");
    assert.ok(ok, `${x.name} 不能被 Claude App 连上`);
  }
});

test("只用 DeepSeek 官方 App：没有推荐，提醒原因并建议换入口", () => {
  const r = run("deepseek_official");
  assert.equal(r.total_kept, 0);
  assert.equal(r.notices.length, 1);
  assert.match(r.notices[0], /DeepSeek/);
  assert.ok(r.relax.length > 0);
  assert.ok(!r.relax.some((x) => x.label.includes("遥控电脑")), "用户没有电脑");
});

test("遥控电脑上的 Claude Code：选择多，都能配合 Claude Code 并装在电脑上", () => {
  const r = run("claude_code_remote");
  assert.ok(r.total_kept >= 30, `只有 ${r.total_kept} 个`);
  for (const x of r.results) {
    assert.notEqual(x.category, "自带记忆的应用");
    assert.ok(vals(x.id, "runs_on").includes("own_computer"), `${x.name} 装不到电脑上`);
    assert.ok(["claude_code", "any_mcp_client"].some((c) => vals(x.id, "compatible_clients").includes(c)), `${x.name} 配合不了 Claude Code`);
  }
});

test("Kelivo＋VPS：手机能连上；有 Dylan Heartbeat；没有酒馆专用扩展和默认托管的项目", () => {
  const r = run("kelivo_vps");
  const kept = ids(allKept(r));
  assert.ok(kept.includes("dylan-heartbeat"));
  for (const st of ["smart-memory", "vecthare", "extension-summaryception"]) assert.ok(!kept.includes(st), `不该推荐酒馆扩展 ${st}`);
  for (const hosted of ["supermemory", "honcho", "central-intelligence"]) assert.ok(!kept.includes(hosted), `没选托管，不该推荐 ${hosted}`);
});

test("酒馆角色扮演：酒馆扩展排在前面，不推荐要自己写代码接入的情绪引擎", () => {
  const r = run("sillytavern_roleplay");
  // 2026-10-27 起酒馆装社区 MCP 扩展后也能接 MCP 记忆库，所以只要求原生扩展领先，MCP 的要带安装提示
  const native = (x) => vals(x.id, "compatible_clients").includes("sillytavern");
  assert.ok(native(r.results[0]), `${r.results[0].name} 不是酒馆扩展`);
  assert.ok(r.results.slice(0, 3).filter(native).length >= 2, "前三名里酒馆扩展不到两个");
  for (const x of r.results.filter((x) => !native(x) && vals(x.id, "compatible_clients").includes("any_mcp_client")))
    assert.ok(x.cautions.some((c) => c.includes("SillyTavern-MCP-Client")), `${x.name} 缺少装 MCP 扩展的提示`);
  for (const x of r.addons.state_engine?.items || [])
    assert.ok(native(x) || vals(x.id, "compatible_clients").includes("any_mcp_client"), `${x.name} 接不进酒馆`);
});

test("AstrBot 机器人：推荐 AstrBot 插件，不推荐 OpenClaw 专用插件", () => {
  const r = run("astrbot_qq");
  const kept = ids(allKept(r));
  assert.ok(kept.includes("astrbot-plugin-livingmemory"));
  assert.ok(!kept.includes("memory-lancedb-pro"));
});

test("新手、只有手机、0 元、想用自带记忆的应用：结果很少，给出放宽建议", () => {
  const r = run("novice_phone_free");
  assert.ok(r.total_kept < 3);
  assert.ok(r.relax.length > 0);
  for (const x of r.results) assert.equal(x.category, "自带记忆的应用");
});

test("只用本地模型、0 元、不注册账号：都免费或能用本地模型，不需要账号", () => {
  const r = run("privacy_local_free");
  assert.ok(r.total_kept > 10);
  for (const x of r.results) {
    const cost = vals(x.id, "cost");
    const local = vals(x.id, "local_model").includes("yes");
    assert.ok(!cost.length || cost.includes("free") || (local && cost.includes("model_fees_only")), `${x.name} 不免费`);
    assert.ok(!(vals(x.id, "data_passes_through").length === 1 && vals(x.id, "data_passes_through")[0] === "third_party"));
    const accounts = vals(x.id, "accounts_needed").filter((a) => a !== "none" && !(a === "model_api_key" && local) && a !== "vendor_account");
    assert.deepEqual(accounts, [], `${x.name} 需要账号 ${accounts}`);
  }
});

test("Codex 多端、先审核、留情感：Ombre Brain 靠前，有先审核的项目，有搭配组合，没有 Claude 专用项目", () => {
  const r = run("codex_multi_review");
  assert.ok(ids(r.results).slice(0, 3).includes("ombre-brain"));
  assert.ok(r.results.some((x) => vals(x.id, "write_mode").includes("review_first")), "前 8 名应有先审核再入库的项目");
  assert.ok(r.combos.some((c) => ids(c.parts).includes("ombre-brain") && ids(c.parts).includes("machine-studio")));
  for (const x of allKept(r)) assert.notEqual(vals(x.id, "model_lock")[0], "claude_only", `${x.name} 只能配合 Claude`);
});

test("每个被排除的项目都有原因；结果里没有被排除、未审核的项目", () => {
  for (const p of PERSONAS) {
    const r = engine.recommend(answersOf(p), projects);
    for (const e of r.excluded) assert.ok(e.reason, `${p.id}：${e.name} 没有排除原因`);
    for (const x of allKept(r)) {
      assert.notEqual(byId[x.id].inclusion.status, "excluded");
      assert.notEqual(byId[x.id].review_status, "unreviewed");
    }
  }
});
