// 在 Node 里加载问卷配置、设置和全部项目（测试和命令行用；网站前端另外打包数据）。
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRuleEngine } from "./index.js";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

export function loadAll() {
  const questionnaire = readJson(join(ROOT, "data/questionnaire/questions.json"));
  const settings = readJson(join(ROOT, "data/settings.json"));
  const dir = join(ROOT, "data/projects");
  const projects = readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => readJson(join(dir, f)));
  const engine = createRuleEngine({ questionnaire, settings });
  return { questionnaire, settings, projects, engine };
}
