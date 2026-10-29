// Codex 生成：只读原始材料，只写入当前生成目录。
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(here);
const json = async (file) => JSON.parse(await readFile(path.join(root, file), 'utf8'));
const questionnaire = await json('data/questionnaire/questions.json');
const settings = await json('data/settings.json');
const files = (await readdir(path.join(root, 'data/projects'))).filter(f => f.endsWith('.json')).sort();
const projects = await Promise.all(files.map(async file => {
  const p = await json(`data/projects/${file}`);
  return { id: p.id, name: p.name, repo_url: p.repo_url, review_status: p.review_status,
    candidate: p.candidate, normalized: Object.fromEntries(Object.entries(p.normalized || {}).map(([k, v]) => [k, {value: v.value, status: v.status}])),
    inclusion: p.inclusion, info: {summary: p.info?.summary}, repo_health: {read_date: p.repo_health?.read_date} };
}));
let engine = await readFile(path.join(root, 'engine/rule-engine.js'), 'utf8');
engine = engine.replace(/^export\s*\{[^}]+\};?\s*$/gm, '').replace(/^export\s+/gm, '');
await mkdir(path.join(here, 'assets'), { recursive: true });
await writeFile(path.join(here, 'assets/generated-engine.js'), `// Codex 生成：原推荐引擎只读快照。\n(() => {\n${engine}\nwindow.MemoryEngine = {createRuleEngine, checkCondition: checkCond, findConflicts};\n})();\n`);
await writeFile(path.join(here, 'assets/generated-data.js'), `// Codex 生成：原问卷与项目数据只读快照。\nwindow.MemoryData = ${JSON.stringify({questionnaire, settings, projects})};\n`);
console.log(`生成 ${questionnaire.questions.length} 个题目配置，${projects.length} 个项目快照。原材料未写入。`);
