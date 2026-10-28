// 把网站要用的项目数据打包成一个文件：site/data/projects.json（生成文件，不进仓库）。
// 结果页在浏览器里跑推荐引擎，要读全部项目；data/projects/ 下有两百多个文件，逐个 fetch 太慢，raw 原文也用不上。
// 只留引擎和页面要用的部分：被排除的项目不打包，字段只留 value 和 status。
// 用法：node scripts/build_site_data.mjs（npm run site 会先跑它）
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadAll, ROOT } from "../engine/load-node.js";

const { projects, settings } = loadAll();
const displayNames = JSON.parse(readFileSync(join(ROOT, "data/display_names.json"), "utf8"));
// 网站显示的白话简介；规则判定读的是原始简介，不受影响
const displaySummaries = JSON.parse(readFileSync(join(ROOT, "data/display_summaries.json"), "utf8"));
const slim = projects
  .filter((p) => p.inclusion?.status !== "excluded")
  .map((p) => ({
    id: p.id, name: displayNames[p.id] || p.name, repo_url: p.repo_url,
    candidate: { category: p.candidate.category },
    inclusion: { status: p.inclusion.status, flags: p.inclusion.flags || [] },
    review_status: p.review_status,
    info: { summary: { value: displaySummaries[p.id] || p.info?.summary?.value || "" } },
    normalized: Object.fromEntries(Object.entries(p.normalized).map(([k, f]) => [k, { value: f.value, status: f.status }])),
    ...(p.safety_note ? { safety_note: p.safety_note.note } : {}),
  }));

const dir = join(ROOT, "site/data");
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, "projects.json"), JSON.stringify({ settings, projects: slim }));
console.log(`已打包 ${slim.length} 个项目到 site/data/projects.json`);
