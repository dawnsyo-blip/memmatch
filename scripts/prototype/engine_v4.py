"""问卷 v4（加上第 3 题新增的“手机远程操控电脑上的 Agent”）的简易推荐引擎原型，用来模拟填写。"""
import glob
import json
import random
from collections import Counter

ROOT = r"D:/vscode 项目/记忆库推荐"
DOCS = [json.load(open(f, encoding="utf-8")) for f in glob.glob(ROOT + "/data/projects/*.json")]
DOCS = [d for d in DOCS if d["inclusion"]["status"] != "excluded"]


def V(d, f):
    v = d["normalized"][f]["value"]
    return v if isinstance(v, list) else ([v] if v else [])


def known(d, f):
    return d["normalized"][f]["status"] != "unknown"


ENTRY_CLIENTS = {
    "remote_control": {"anthropic": ["claude_code"], "openai": ["codex"], "deepseek": ["deepseek_harness"]},
    "programmatic": ["claude_code", "codex", "gemini_cli", "openclaw", "hermes", "astrbot", "telegram", "wechat",
                     "feishu", "discord", "openai_compatible", "deepseek_harness", "any_mcp_client"],
    "api_client": ["kelivo", "any_mcp_client", "openai_compatible", "sillytavern"],
}
RUN = {"computer": "own_computer", "server": "own_server", "vps_new": "own_server", "cloud_free": "own_cloud_account",
       "phone": "phone", "hosted": "third_party_hosted"}
DEVICE_OS = {"iphone": "ios", "android": "android", "windows": "windows", "mac": "macos", "linux": "linux"}
W = [3, 2, 1]


def rank_w(lst):
    return {x: (W[i] if i < 3 else 1) for i, x in enumerate(lst)}


def hard(d, a):
    """返回 (是否保留, 提示列表, 排除原因)。"""
    notes, cat = [], d["candidate"]["category"]
    clients = set(V(d, "compatible_clients"))
    runs = set(V(d, "runs_on"))
    vend = set(a["q1"])
    # 第 3 题：入口
    ok_entry = False
    for e in a["q3"]:
        if e == "app" and cat == "自带记忆的应用":
            ok_entry = True
        elif e == "official":
            web = (("anthropic" in vend and "claude_web_mobile" in clients) or ("openai" in vend and "chatgpt" in clients)
                   or (vend & {"anthropic", "openai", "google"} and "remote_mcp" in V(d, "phone_access")))
            ok_entry |= bool(web) and cat != "自带记忆的应用"
        elif e in ("remote_control", "programmatic") and a.get("q3a"):
            q3a = {"astrbot": ["astrbot", "telegram", "wechat", "feishu", "discord"]}
            allowed = {c for x in a["q3a"] for c in q3a.get(x, [x])} | {"any_mcp_client"}
            if e == "programmatic":
                allowed.add("openai_compatible")
            if clients & allowed and cat != "自带记忆的应用":
                ok_entry = True
        elif e == "remote_control":
            allowed = {c for v in vend for c in ENTRY_CLIENTS["remote_control"].get(v, [])} | {"any_mcp_client"}
            if clients & allowed and cat != "自带记忆的应用":
                ok_entry = True
        elif e in ENTRY_CLIENTS and clients & set(ENTRY_CLIENTS[e]) and cat != "自带记忆的应用":
            ok_entry = True
    if not ok_entry:
        if not known(d, "compatible_clients"):
            notes.append("能配合哪些入口文档没写")
        else:
            return False, notes, "入口不匹配"
    # 第 5 题：运行位置（预算 0 元时去掉新买 VPS 和托管）
    locs = [x for x in a["q5"] if not (a["q18"] == "0" and x in ("vps_new", "hosted"))]
    allowed_runs = {RUN[x] for x in locs}
    if "remote_control" in a["q3"] and set(a["q3"]) <= {"remote_control"}:
        allowed_runs &= {"own_computer"}  # 遥控电脑上的 Agent，记忆库要在同一台电脑上
    if cat != "自带记忆的应用":
        if runs and not runs & allowed_runs:
            return False, notes, "运行位置不匹配"
    if "hosted" not in locs and set(V(d, "data_passes_through")) == {"third_party"}:
        return False, notes, "只能托管"
    # 第 4 题：手机能否连上、跨入口
    phone_side = set(a["q3"]) & {"official", "api_client"}
    if phone_side and not set(a["q3"]) & {"remote_control", "programmatic", "app"} and cat != "自带记忆的应用":
        pa = set(V(d, "phone_access")) - {"not_mentioned"}
        if not pa:
            return False, notes, "手机连不上"
        if pa <= {"needs_tunnel"}:
            notes.append("要自己用 Tunnel 或 Tailscale 打通")
    # 多端：文档没写不排除；只排除明显只能在一处用的（自带界面的应用、只能装在单个宿主里且没有 MCP/网关的）
    if a["q4"] == "multi" and "yes" not in V(d, "cross_client"):
        single_host = not set(V(d, "access")) & {"mcp", "gateway"} and len(clients - {"developer_built"}) <= 1
        if "self_contained" in V(d, "pairing") or single_host:
            return False, notes, "不能跨入口共享"
        notes.append("文档没写能否多端共用（MCP 服务一般可以）")
    # 系统
    user_os = {DEVICE_OS[x] for x in a["q2"] if x in DEVICE_OS}
    os_ = set(V(d, "os"))
    if cat == "自带记忆的应用":
        if os_ and not os_ & (user_os | {"any"}):
            return False, notes, "系统不匹配"
    elif runs and runs <= {"own_computer"} and os_ and not os_ & (user_os | {"any"}):
        return False, notes, "系统不匹配"
    # 第 16 题：门槛
    diff = V(d, "difficulty")
    if a["q16"] == "low" and (diff and diff != ["low"] or cat in ("需写代码（开发者向）", "教程与搭建指南")):
        return False, notes, "门槛太高"
    if a["q16"] == "medium" and (diff == ["high"] or cat == "需写代码（开发者向）"):
        return False, notes, "门槛太高"
    # 第 17 题：账号
    allow = {"none"}
    m = {"api_key": "model_api_key", "github": "github", "vendor": "vendor_account"}
    allow |= {m[x] for x in a["q17"] if x in m}
    if "subscription" in a["q17"] and "anthropic" in vend:
        allow.add("claude_subscription")
    if "cloud_free" in locs:
        allow |= {"cloudflare", "render"}
    if a["q18"] == "0" and V(d, "local_model") != ["yes"]:
        allow.discard("model_api_key")
    if vend == {"local"} and V(d, "local_model") == ["yes"]:
        allow.add("model_api_key")
    need = set(V(d, "accounts_needed"))
    if "vendor_account" in need and {"local_only", "third_party"} <= set(V(d, "data_passes_through")):
        if "vendor_account" not in allow:
            need.discard("vendor_account")
            notes.append("按自己部署的方式用")
    if need - allow:
        return False, notes, "需要的账号没勾：" + "、".join(sorted(need - allow))
    # 第 18 题：费用
    cost = V(d, "cost")
    if cost and a["q18"] == "0" and cost != ["free"] and not (V(d, "local_model") == ["yes"] and cost == ["model_fees_only"]):
        return False, notes, "超出预算"
    if cost and a["q18"] in ("10", "50") and cost == ["paid_service"]:
        return False, notes, "超出预算"
    # 第 1 题：绑定模型
    if V(d, "model_lock") == ["claude_only"] and "anthropic" not in vend:
        return False, notes, "只能配合 Claude"
    return True, notes, ""


def score(d, a):
    s, why = 0.0, []

    def add(n, w, txt):
        nonlocal s
        if w:
            s += w
            why.append(txt)

    y = lambda f: "yes" in V(d, f)
    has = lambda f, v: v in V(d, f)
    act = rank_w(a["q7"])
    for k, w in act.items():
        if k == "companion":
            add(k, w * (y("persona_continuity") + bool(set(V(d, "emotion_handling")) - {"not_mentioned"}) + y("proactive") + y("relationship_stage")), "陪伴相关能力")
        if k == "roleplay":
            add(k, w * (has("compatible_clients", "sillytavern") * 2 + y("time_awareness") + y("persona_continuity")), "角色扮演相关")
        if k == "schedule":
            add(k, w * (y("time_awareness") + y("proactive")), "时间感与主动性")
        if k == "work":
            add(k, w * (y("window_handoff") + has("project_role", "context_tool") + y("cross_client")), "换窗续接")
    prob = rank_w(a["q8"])
    for k, w in prob.items():
        if k == "entry_hallucination":
            add(k, w * (bool(V(d, "human_review")) + has("write_mode", "review_first") + y("write_receipt")), "能看到记了什么")
        if k == "overwrite":
            add(k, w * (y("error_guard") + y("time_awareness")), "新旧事实有历史")
        if k == "no_priority":
            add(k, w * (has("multi_factor", "multi") + has("ranking_signals", "importance") + has("emotion_handling", "weighting") + y("sensitive_suppression")), "分轻重")
        if k == "you_me":
            add(k, w * (y("verbatim") + y("error_guard")), "原话可追溯")
        if k == "stereotype":
            add(k, w * (y("verbatim") + y("time_awareness") + has("ranking_signals", "confidence")), "保留细节与时间")
        if k == "verbatim_repeat":
            add(k, w * has("lifecycle", "consolidate"), "会整理成摘要")
        if k == "fabrication":
            add(k, w * (2 if y("reflection") and y("error_guard") else 0), "反思可追溯")
    if a["q4"] == "multi":
        add("q4", 2 * y("cross_client"), "写明能多端共用")
    q9 = {"auto": has("write_mode", "auto"), "auto_review": has("write_mode", "auto") and bool(V(d, "human_review")),
          "review_first": has("write_mode", "review_first")}[a["q9"]]
    add("q9", (4 if a["q9"] == "review_first" else 2) * q9, "写入方式合意")
    if a.get("q10") == "chat":
        add("q10", 1.5 * has("memory_writer", "chat_agent"), "聊天的 AI 自己记")
    if a.get("q10") == "background":
        add("q10", 1.5 * (has("memory_writer", "background") or y("dream_consolidation")), "后台整理")
    if a["q11"] == "later":
        add("q11", has("ranking_signals", "relation") + y("dream_consolidation"), "后台慢慢整理")
    if a["q12"] in ("sometimes", "often"):
        add("q12", bool(V(d, "human_review")) + y("pinning") + has("customization", "plain_data"), "方便自己整理")
    else:
        add("q12", has("lifecycle", "consolidate"), "自动整理")
    if a["q13"] == "yes":
        add("q13", bool(set(V(d, "forgetting")) & {"auto_decay", "archive"}), "会淡忘")
    elif a["q13"] == "emotional":
        add("q13", 2 * has("emotion_handling", "weighting") + has("scoring_stages", "forget") + y("pinning"), "情感重的会留着")
    else:
        add("q13", bool(set(V(d, "forgetting")) & {"none", "archive", "manual_only"}), "不随便遗忘")
    if a["q14"] == "fast":
        add("q14", has("recall_uses_llm", "no_llm") - has("recall_uses_llm", "llm"), "召回快")
    elif a["q14"] == "few":
        add("q14", has("multi_factor", "multi") + bool(set(V(d, "retrieval_postprocess")) - {"not_mentioned"}), "检索更细")
    else:
        add("q14", has("multi_factor", "multi") + has("recall_uses_llm", "llm"), "深度检索")
    # 推荐偏好（默认，各加 0.5）
    pref = [y("verbatim") or y("error_guard"), has("memory_layers", "layered"), y("reflection") and "fabrication" not in prob,
            bool(set(V(d, "chinese_support")) - {"not_mentioned"}), has("chinese_support", "zh_retrieval"),
            bool(set(V(d, "retrieval_postprocess")) - {"not_mentioned"}), bool(set(V(d, "customization")) - {"not_mentioned"}),
            has("lifecycle_complete", "complete")]
    s += 0.5 * sum(pref)
    return s, why


def recommend(a, n=8):
    keep, reasons = [], Counter()
    for d in DOCS:
        ok, notes, why = hard(d, a)
        if ok:
            sc, w = score(d, a)
            keep.append((sc, d, notes, w))
        else:
            reasons[why.split("：")[0]] += 1
    keep.sort(key=lambda x: -x[0])
    return keep, reasons


def random_answer(rng):
    pick = lambda xs, k=None: rng.sample(xs, k or rng.randint(1, len(xs)))
    a = {"q1": pick(["anthropic", "openai", "google", "glm", "deepseek", "local"], rng.randint(1, 2)),
         "q2": pick(["iphone", "android"], 1) + pick(["windows", "mac", "linux", "server"], rng.randint(0, 2)),
         "q3": pick(["official", "remote_control", "programmatic", "api_client", "app"], rng.randint(1, 2)),
         "q4": rng.choice(["phone_only", "phone_memory_elsewhere", "multi"]),
         "q5": pick(["computer", "server", "vps_new", "cloud_free", "phone", "hosted"], rng.randint(1, 3)),
         "q7": pick(["companion", "roleplay", "schedule", "work", "coding"], rng.randint(1, 3)),
         "q8": pick(["entry_hallucination", "overwrite", "no_priority", "you_me", "stereotype", "verbatim_repeat", "fabrication"], rng.randint(1, 4)),
         "q9": rng.choice(["auto", "auto_review", "review_first"]), "q10": rng.choice(["chat", "background", "any"]),
         "q11": rng.choice(["now", "later", "any"]), "q12": rng.choice(["agent", "sometimes", "often"]),
         "q13": rng.choice(["yes", "emotional", "no"]), "q14": rng.choice(["fast", "few", "long"]),
         "q15": rng.choice(["yes", "no", "unknown"]), "q16": rng.choice(["low", "medium", "high"]),
         "q17": pick(["api_key", "subscription", "github", "vendor"], rng.randint(0, 3)) or ["none"],
         "q18": rng.choice(["0", "10", "50", "more"])}
    return a


if __name__ == "__main__":
    rng = random.Random(7)
    empty, total, blockers = 0, 3000, Counter()
    by_feature = Counter()
    for _ in range(total):
        a = random_answer(rng)
        keep, reasons = recommend(a)
        if not keep:
            empty += 1
            blockers.update(reasons.most_common(1)[0][0:1])
            by_feature[(tuple(sorted(a["q3"])), a["q16"], a["q18"])] += 1
    print(f"随机 {total} 份答卷，推荐为空 {empty} 份（{empty/total:.0%}）")
    print("为空时排除最多的原因：", blockers.most_common())
    print("为空最多的组合（入口, 门槛, 预算）：", by_feature.most_common(8))
