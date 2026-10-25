import sys
sys.path.insert(0, __import__("os").path.dirname(__file__))
from engine_v4 import recommend

BASE = {"q6": "native", "q7": ["companion"], "q8": ["no_priority"], "q9": "auto_review", "q10": "any", "q11": "any",
        "q12": "sometimes", "q13": "emotional", "q14": "few", "q15": "unknown"}
P = {
    "A 只用 Claude 手机 App、只有 iPhone、不想折腾": dict(q1=["anthropic"], q2=["iphone"], q3=["official"], q4="phone_only",
        q5=["phone", "cloud_free"], q16="low", q17=["subscription"], q18="10"),
    "B Claude App 遥控电脑上的 Claude Code，Mac 常开": dict(q1=["anthropic"], q2=["iphone", "mac"], q3=["remote_control"],
        q4="phone_memory_elsewhere", q5=["computer"], q16="medium", q17=["subscription", "api_key"], q18="10"),
    "C 安卓 + Kelivo + DeepSeek API，有 VPS，能敲命令": dict(q1=["deepseek"], q2=["android", "server"], q3=["api_client"],
        q4="phone_memory_elsewhere", q5=["server"], q16="medium", q17=["api_key"], q18="50"),
    "D 酒馆角色扮演，Windows 电脑跑酒馆，手机浏览器访问": dict(q1=["deepseek", "anthropic"], q2=["android", "windows"], q3=["api_client"],
        q4="phone_memory_elsewhere", q5=["computer"], q16="medium", q17=["api_key"], q18="10", q7=["roleplay", "companion"]),
    "E QQ 里的 AstrBot 机器人，服务器上跑": dict(q1=["deepseek"], q2=["android", "server"], q3=["programmatic"], q4="phone_only",
        q5=["server"], q16="medium", q17=["api_key"], q18="10"),
    "F 新手，只有手机，只能 0 元，想直接用自带记忆的应用": dict(q1=["deepseek"], q2=["android"], q3=["app"], q4="phone_only",
        q5=["phone"], q16="low", q17=["none"], q18="0", q6="none"),
    "G 只用 DeepSeek 官方 App": dict(q1=["deepseek"], q2=["iphone"], q3=["official"], q4="phone_only", q5=["phone"],
        q16="low", q17=["none"], q18="0"),
    "H 多端（手机 Kelivo＋电脑 Claude Code），有服务器，能写代码，工作续接为主": dict(q1=["anthropic", "openai"],
        q2=["iphone", "mac", "server"], q3=["api_client", "remote_control"], q4="multi", q5=["computer", "server"],
        q16="high", q17=["api_key", "github"], q18="50", q7=["work", "schedule"], q8=["overwrite", "entry_hallucination"]),
}
for name, a in P.items():
    ans = {**BASE, **a}
    keep, why = recommend(ans)
    print(f"\n【{name}】保留 {len(keep)} 个；排除原因 {dict(why.most_common(4))}")
    for sc, d, notes, w in keep[:6]:
        print(f"   {sc:5.1f} {d['name']}（{d['candidate']['category']}）{'；'.join(notes)}")
