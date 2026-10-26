"""阶段 1 追加（2026-10-24）：记忆怎么打分、怎么处理情绪，项目怎么用、能否搭配、便于自己改。

负责人要求：区分“生成、遗忘、检索时是否按重要性等多个维度评级，而不是单一维度”，尤其看情绪、感觉这类变量
怎么处理；以及项目是否覆盖完整的记忆流程、能否和其它项目搭配、是否便于用户以后自己修改。

字段分三种来源：
  - 由已有字段推出（lifecycle、lifecycle_complete、multi_factor、部分 pairing／customization）
  - 原表、说明（info）里命中关键词
  - 只在 README 中命中：摘录经 Claude 逐条核对，误判记在 REJECT 里
都没提到时记 not_mentioned（未提及，不等于没有）。
"""

NM = {"not_mentioned": "未提及"}
ENUMS = {
    "ranking_signals": {
        "semantic": "语义相似（向量）", "keyword": "关键词／全文", "recency": "新旧／时间衰减",
        "importance": "重要性评分", "frequency": "使用频率／被想起的次数", "emotion": "情感强度",
        "relation": "关联扩散（图谱、链接）", "confidence": "置信度／来源可信度", **NM},
    "scoring_stages": {"write": "写入时打分或筛选", "retrieve": "召回时综合排序", "forget": "遗忘时按分数决定", **NM},
    "multi_factor": {"multi": "多维（相似度之外至少综合两个因素）", "single": "单一（只看相似度，或只多一个因素）", **NM},
    "emotion_handling": {
        "tags": "给记忆打情绪标签（如效价、唤醒度）", "weighting": "情绪强度影响记忆的保留或召回",
        "ai_state": "AI 自己有会随时间变化的情绪、驱力或身体状态", "user_mood": "记录用户的心情和状态", **NM},
    "project_role": {
        "full_memory": "完整记忆系统", "context_tool": "上下文延续工具（压缩、摘要、换窗）",
        "memory_component": "记忆部件（只做其中一环）", "state_engine": "状态引擎（情绪、身体、梦）",
        "companion_app": "自带记忆的应用或 agent", "dev_framework": "开发框架或代码库", "guide": "教程或设计文档"},
    "lifecycle": {"capture": "写入", "consolidate": "整理（合并、摘要、反思）", "retrieve": "召回",
                  "forget": "自动遗忘或归档", "review": "人工查看和修改"},
    "lifecycle_complete": {"complete": "五个环节都有", "partial": "只覆盖部分环节"},
    "pairing": {
        "designed_to_pair": "明确说明可和其它记忆库搭配（旁路、叠加）",
        "standard_interface": "走 MCP、OpenAI 兼容接口或宿主插件，可和别的工具并用",
        "replaces_builtin": "会替换宿主自带的记忆或压缩", "self_contained": "自带完整界面，记忆不拿出来和别的项目共用",
        "depends_on": "要先有另一个项目才能用", **NM},
    "customization": {
        "settings_ui": "在界面里改设置", "config_file": "改配置文件或环境变量", "prompts": "可以改提示词",
        "plain_data": "记忆是可以直接编辑的普通文件", "plugin_api": "留了插件或扩展接口",
        "small_code": "代码小巧（单文件、零依赖），方便自己改", **NM},
}
# 2026-10-24 第二批：问卷 v2 用到、原来数据里没有的 7 项
ENUMS.update({
    "chinese_support": {"zh_docs": "有中文说明文档", "zh_retrieval": "中文检索做过优化（分词、中文向量模型等）", **NM},
    "memory_layers": {"layered": "分层记忆（短期／长期、碎片／事件／核心等）", "flat": "单层，没有分层", **NM},
    "retrieval_postprocess": {"rerank": "召回后重排", "dedup": "去重、避免反复浮现", "budget": "按 token 预算裁剪",
                              "threshold": "相关度不够就不注入", **NM},
    "recall_uses_llm": {"no_llm": "召回时不调用大模型（更快更省）", "llm": "召回时会调用大模型（重排、改写或让 AI 自己翻找）", **NM},
    "sensitive_suppression": {"yes": "能压住不该再提的记忆（用户拒绝过、标记回避或未解决的）", **NM},
    "write_receipt": {"yes": "写入后能明确告诉你记没记上（回执、返回编号、可回读）", **NM},
    "memory_writer": {"chat_agent": "聊天的 AI 自己调用工具记", "background": "后台的模型或规则自动整理",
                      "user": "用户自己手动记", **NM},
})
# 2026-10-25 第三批：问卷 v4 面向手机用户后需要的 3 项
ENUMS.update({
    "phone_access": {
        "native": "手机入口直接可用（本身在手机上，或装在机器人、Kelivo、酒馆等宿主里）",
        "remote_mcp": "提供远程 MCP（Claude App 等可添加为连接器）",
        "http_endpoint": "网关部署在服务器或云上，手机客户端填地址即可",
        "cloud": "本身跑在云上（自己的云账号或托管）",
        "needs_tunnel": "要自己用 Cloudflare Tunnel、Tailscale 等打通", **NM},
    "local_model": {"yes": "可以用本地模型（Ollama、LM Studio 等）代替付费接口", "no_model_needed": "本身不调用模型", **NM},
    "model_lock": {"claude_only": "只能配合 Claude（官方客户端或付费套餐）", "openai_only": "只能配合 ChatGPT／OpenAI",
                   "not_mentioned": "没发现限制"},
    # 2026-10-25 逐项核实时加：部署在云上的项目，有的全程浏览器就能装好，有的要在电脑上敲命令部署
    "setup_device": {"phone_ok": "只用手机就能装好（手机 App、宿主插件，或全程浏览器部署）",
                     "needs_computer": "安装或部署时要用电脑", **NM},
})
# 2026-10-26 第四批：能否真正检索并重新召回多模态内容（负责人要求）。
# 标准：系统自己保管图片／音频／视频的原件（或直接给原件做向量），召回时能把原件交回；
# 只把多模态内容转成文字再存文字（图片描述、语音转写、OCR）的不算。全部逐项人工核实，规则不自动判定。
ENUMS.update({
    "media_recall": {"image": "图片：保管原图，能检索并重新召回", "audio": "音频：保管原音频，能检索并重新召回",
                     "video": "视频：保管原视频（或关键帧），能检索并重新召回",
                     "not_mentioned": "未提及，或只把多模态内容转成文字再存"},
})
# 2026-10-26 第五批：几个不同的 Agent 能否共用记忆（问卷第 4a 题，负责人要求加题）。
# shared：写明几个 Agent（或工具）读写同一份记忆；per_agent：能给每个 Agent 分开记忆空间或权限，只共享一部分。
# 同一个 Agent 换设备不算；项目内部由几个“子智能体”分管记忆（如 MIRIX）也不算。全部逐项人工核实。
ENUMS.update({
    "multi_agent": {"shared": "写明几个不同的 Agent 共用同一份记忆",
                    "per_agent": "能给每个 Agent 分开记忆空间或权限，只共享一部分",
                    "not_mentioned": "未提及"},
})
LABELS = {
    "multi_agent": "几个 Agent 能否共用记忆",
    "media_recall": "能否检索并召回多模态内容",
    "phone_access": "手机能否连上", "local_model": "能否用本地模型", "model_lock": "是否绑定某家模型",
    "setup_device": "只用手机能否装好",
    "chinese_support": "中文支持", "memory_layers": "记忆是否分层", "retrieval_postprocess": "检索后处理",
    "recall_uses_llm": "召回时是否调用大模型", "sensitive_suppression": "敏感记忆抑制", "write_receipt": "写入回执",
    "memory_writer": "谁来记",
    "ranking_signals": "排序时考虑的因素", "scoring_stages": "在哪一步打分", "multi_factor": "多维还是单一打分",
    "emotion_handling": "情绪怎么处理", "project_role": "项目定位", "lifecycle": "覆盖的记忆环节",
    "lifecycle_complete": "记忆流程是否完整", "pairing": "能否和其它项目搭配", "customization": "便于自己改的地方",
}
# 按 multi_factor 计数的因素（相似度、关键词不算）
EXTRA_SIGNALS = ("recency", "importance", "frequency", "emotion", "relation", "confidence")

# (原表／说明用的中文模式, README 用的模式)
SIGNAL_PATS = {
    "semantic": (r"向量|语义检索|语义搜索|语义召回|嵌入模型|嵌入向量",
                 r"semantic (?:search|recall|retrieval|similarity)|vector (?:search|similarity|recall|retrieval|index|store)|embeddings?\b|向量|语义检索"),
    "keyword": (r"关键词|全文|BM25|FTS",
                r"\bBM25\b|\bFTS5?\b|full[- ]text (?:search|index)|keyword (?:search|match|matching|boost)|lexical (?:search|retrieval|match)|关键词|全文检索"),
    "recency": (r"时效|新旧|时间衰减|越新|新鲜度|近因|遗忘曲线|艾宾浩斯",
                r"\brecency\b|time[- ]decay|temporal[- ](?:decay|proximity|boost|weight)|freshness (?:score|weight|boost)|"
                r"decay(?:s|ed)? (?:with|over) time|forgetting curves?|Ebbinghaus|recent memories (?:rank|score|are weighted)|时间衰减|新鲜度|时效"),
    "importance": (r"重要性|重要度|重要程度|显著性",
                   r"importance[- ](?:score|scoring|weight|weighted|rating|level|threshold)|\bimportance\b(?= *[:=(]| and recency| \d)|"
                   r"scored? (?:by|for) importance|salience (?:score|weight)|\bsalience\b|significance score|重要性|重要度|重要程度"),
    "frequency": (r"使用频率|调用次数|被召回次数|命中次数|越常用|热度|访问次数",
                  r"access (?:count|frequency)|frequently (?:used|accessed|recalled)|retrieval count|recall count|use count|hit count|"
                  r"reinforce(?:d|ment|s)? (?:on|by|with|when|through) (?:access|use|recall|retrieval)|spaced repetition|"
                  r"memory heat|使用频率|召回次数|热度"),
    "emotion": (r"情感权重|情绪强度|情绪浓度|情感强度|效价|唤醒度",
                r"emotional (?:weight|intensity|salience|valence|significance)|\bvalence\b|\barousal\b|affective (?:weight|score|salience)|"
                r"情感权重|情绪强度|情绪浓度|效价|唤醒度"),
    "relation": (r"图谱|多跳|扩散激活|关联扩散|两跳",
                 r"spreading activation|graph (?:traversal|expansion|walk|recall|activation)|multi-hop|2-hop|two-hop|entity graph|"
                 r"knowledge graph|PageRank|扩散激活|多跳|图谱"),
    "confidence": (r"置信度|可信度|来源可信|信任分",
                   r"confidence (?:score|scoring|level|threshold|weight)|trust (?:score|tier|level)s?|source reliability|credibility|置信度|可信度"),
}
STAGE_PATS = {
    "write": (r"写入[^。；]{0,8}(?:打分|评分|重要性|门槛|筛选)|按重要性(?:筛选|过滤)|入库前[^。；]{0,8}(?:打分|评分|筛)|写入时去重、按重要性",
              r"importance (?:gate|threshold|filter)|(?:filter|gate)s? (?:memories )?(?:by|on) importance|"
              r"(?:scores?|rates?) (?:each|every|new|incoming) (?:memor|fact|message|turn)|assign(?:s|ed)? (?:an? )?importance|"
              r"importance (?:is )?(?:assigned|scored|rated|estimated) (?:at|on|when|during)|写入[^。]{0,8}(?:打分|评分|重要性)"),
    "forget": (r"(?:重要|常用|情绪|频率)[^。；]{0,12}(?:衰减|遗忘|淡出|淡去)|(?:衰减|遗忘)[^。；]{0,12}(?:重要|频率|情绪|访问)|按使用情况衰减",
               r"(?:decay|fade|forget|prun)\w*[^.。\n]{0,40}(?:importance|access|frequen|emotion|salien|usage)|"
               r"(?:importance|access count|frequen|emotional|salien)\w*[^.。\n]{0,40}(?:decay|fade|forget|prun)"),
}
EMOTION_PATS = {
    "tags": (r"效价|唤醒度|情绪标签|情感标签|情绪标注",
             r"\bvalence\b|\barousal\b|emotion(?:al)? (?:tags?|labels?)|tagged with (?:emotion|mood)|情绪标签|效价|唤醒度"),
    "weighting": (r"情感权重|情绪强度|情绪浓度|情感强度|情绪加权",
                  r"emotional (?:weight|intensity|salience|significance)|affective (?:weight|salience)|"
                  r"emotional(?:ly)? (?:charged|significant) memories|情感权重|情绪强度|情绪浓度"),
    "ai_state": (r"驱力|身体状态|生理状态|情绪状态|情绪数值|情绪系统|心情值|情绪引擎|情绪与愿望|会漂移的情绪|情绪会自然回落|AI 情绪",
                 r"(?:emotion(?:al)?|mood|affect(?:ive)?) (?:state|engine|system|kernel)|\bdrives? (?:system|engine|kernel|register)|"
                 r"body state|physiological|internal state|Plutchik|驱力|身体状态|情绪状态|情绪系统|情绪引擎"),
    "user_mood": (r"用户的?(?:心情|情绪)|心情和状态|状态和心情|你的(?:心情|情绪)",
                  r"user(?:'s)? (?:mood|emotion(?:al state)?|feelings)|your (?:recent )?mood|track(?:s|ing)? (?:your |the user's )?mood|"
                  r"用户的?(?:心情|情绪)|状态和心情"),
}
PAIR_PATS = {
    "designed_to_pair": (r"旁路|搭配|配合[^。；]{0,10}记忆库|和[^。；]{0,10}记忆库一起用|可叠加|与[^。；]{0,8}并用",
                         r"alongside (?:your |an? |existing |other )?(?:memory|memories|memory system|tools)|"
                         r"works? (?:with|alongside) (?:any|existing|other|your) (?:memory|memories)|"
                         r"complement(?:s|ary)? (?:to )?(?:your |existing |other )?(?:memory|RAG|vector)|sidecar|"
                         r"(?:pair|use) (?:it )?with (?:an? )?(?:external |long-term )?memory|旁路|搭配|配合[^。]{0,10}记忆库"),
    "replaces_builtin": (r"替代[^。；]{0,10}(?:自带|内置|原生)|取代[^。；]{0,10}(?:自带|内置)|接管[^。；]{0,6}(?:记忆|压缩)",
                         r"replaces? (?:Claude Code's |the |your |its )?(?:built-in|native|default) (?:memory|compaction|summari)|"
                         r"instead of (?:the |Claude Code's )?(?:built-in|native) (?:memory|compaction)|替代[^。]{0,10}(?:自带|内置)"),
}
CUSTOM_PATS = {
    "settings_ui": (r"设置页|设置面板|在面板里|配置页|控制台|设置里",
                    r"settings (?:page|panel|UI|tab|screen|view|drawer)|config(?:uration)? (?:page|panel|UI)|"
                    r"(?:configure|change|adjust)[^.\n]{0,30}(?:in|from) the (?:UI|dashboard|web ?UI|settings)|设置页|设置面板|配置页|控制台"),
    "config_file": (r"配置文件|环境变量|\.env",
                    r"\.env\b|config\.(?:json|ya?ml|toml|py)\b|environment variables?|settings\.json|配置文件|环境变量"),
    "prompts": (r"提示词[^。；]{0,8}(?:可改|可替换|可自定义|可配置|可以整条替换)|可(?:自定义|修改|替换)[^。；]{0,6}提示词|附可直接改用的提示词",
                r"(?:custom|editable|customi[sz]able|configurable|your own) (?:system )?prompts?|prompts? (?:are|is|can be) (?:editable|customi[sz]ed|customi[sz]able|configurable|replaced)|"
                r"prompt templates?|提示词[^。]{0,8}(?:可改|可替换|可自定义|可配置|替换)|自定义提示词"),
    "plugin_api": (r"插件系统|插件接口|可插拔|扩展接口|插件引擎",
                   r"plugin (?:system|API|architecture|hooks?|engine|hub)|extension (?:API|points?)|pluggable|插件系统|插件接口|可插拔"),
    "small_code": (r"单文件|零依赖|几百行|只用 Python 标准库|一个脚本",
                   r"single[- ]file|zero[- ]dependenc|no (?:external )?dependencies|~?\d{3} lines|单文件|零依赖|只用 Python 标准库"),
}

ZH_RETRIEVAL = (r"jieba|中文分词|分词|中文检索|中文向量|bge-m3|bge-zh|中英双语|中文优化|CJK",
                r"\bjieba\b|\bCJK\b|Chinese (?:tokeni[sz]|segmentation|search|retrieval|embedding)|bge-m3|bge-(?:large|base|small)-zh|"
                r"text2vec|中文分词|中英双语|双语检索")
ZH_DOCS_LINK = r"README[._-]?(?:zh|cn|ZH|CN)|简体中文|中文版|中文说明|\[中文\]|中文 \|"
LAYER_PATS = (r"(?:两|二|三|四|五|六|多)层(?:记忆|存储|滚动记忆|摘要|衰减|持久记忆)|分层(?:记忆|存储|摘要|递归摘要)|"
              r"短期[^。；]{0,10}长期|长期[^。；]{0,10}短期|工作记忆|热层|冷层|碎片[^。；]{0,6}事件[^。；]{0,6}核心|日历层级|记忆分层",
              r"(?:two|three|four|five|six|multi)[- ](?:tier|layer|level)(?:ed)? (?:memory|memories|storage|store|recall|cascade|retrieval)|"
              r"memor(?:y|ies) (?:flow through|move through|live in) (?:two|three|four|\d) (?:tiers|layers)|"
              r"hierarchical (?:memory|summar|consolidation)|short-term[^.\n]{0,40}long-term|long-term[^.\n]{0,40}short-term|"
              r"working memory[^.\n]{0,40}(?:long-term|episodic|archiv|overf)|episodic[^.\n]{0,30}semantic|"
              r"hot[^.\n]{0,6}warm[^.\n]{0,6}cold|L0/L1/L2 layered|abstracts \(L0\)|分层记忆|三层记忆")
FLAT_PATS = (r"单层|不分层", r"single[- ](?:layer|tier)|flat (?:memory|store|list)|no tiers")
POST_PATS = {
    "rerank": (r"重排|重新排序|精排",
               r"\brerank|re-rank|cross-encoder|reranker|重排"),
    # 只算检索、注入时的去重；写入时去重不算
    "dedup": (r"反复浮现|召回[^。；]{0,10}去重|去重[^。；]{0,10}(?:召回|注入|结果)|注入去重",
              r"(?:recall|retriev|search|result|inject)\w*[^.\n]{0,30}(?:dedup|de-dup|deduplicat)|"
              r"(?:dedup|de-dup|deduplicat)\w*[^.\n]{0,30}(?:results|recall|retriev|inject)|recall ledger|"
              r"cooldown[^.\n]{0,30}(?:recall|memor|resurfac)|avoid (?:repeating|resurfacing)|反复浮现"),
    "budget": (r"token 预算|按预算|预算内|篇幅上限",
               r"token[- ]budget|budget(?:ed)? (?:of|in) tokens|within (?:a|the) (?:token )?budget|fits? (?:in|within) (?:the )?(?:context|budget)|"
               r"max(?:imum)?[_ ]tokens? (?:for|of) (?:recall|context|memor)|token 预算"),
    "threshold": (r"(?:相关度|相似度|召回)[^。；]{0,8}(?:门槛|阈值)|准入门槛|门槛制召回|相关性过了门槛|宁可不答|宁缺毋滥|最低分",
                  r"(?:relevance|similarity|score) (?:threshold|floor|cutoff|gate)|min(?:imum)?[_ ]score|below (?:a|the) (?:threshold|cutoff)|"
                  r"calibrated floor|abstain|says? (?:it )?(?:doesn't|does not|don't) know|相关性过了门槛|召回门槛"),
}
NO_LLM_PATS = (r"不调用大模型|不调大模型|无需大模型|不用大模型|不依赖大模型|零 LLM|无需 LLM|不调用 LLM",
               r"no LLM (?:call|in|at|during|needed|required)|without (?:an? |calling (?:an? )?)?LLM|zero[- ]LLM|LLM[- ]free|"
               r"no generative[- ]LLM|no model calls?|不调用大模型|不调用 LLM")
LLM_RECALL_PATS = (r"大模型重排|LLM 重排|让 AI 自己(?:查|翻)|工具自己查|多轮检索|查询改写|智能体检索",
                   r"LLM[- ](?:rerank|re-rank|judge(?:s|d)? relevance|based retrieval|powered retrieval|query rewrit)|"
                   r"agentic (?:retrieval|recall|search|timeline fill)|query (?:rewriting|expansion) (?:with|via|using) (?:an? )?LLM|"
                   r"multi-round (?:retrieval|recall)|让 AI 用工具自己查")
SUPPRESS_PATS = (r"不再提|别再提|不想再提|拒绝过的|被拒绝的记忆|被你拒绝的记忆|禁止召回|不会被重新写回|抑制召回",
                 r"(?:rejected|dismissed) (?:memories|facts|items) (?:stay|remain|are never|never)|never (?:resurface|bring (?:it |them )?up)|"
                 r"do(?:n't| not) bring (?:it |this |them )?up|suppress(?:ed|ion)? (?:list|memor|recall|topics)|forbidden recall|"
                 r"blocked (?:topics|memories)|do-not-recall|不再提|禁止召回")
RECEIPT_PATS = (r"写入回执|写入确认|已保存确认|返回记忆编号",
                r"write confirmation|confirms? (?:the )?(?:memory|write|save) (?:was )?(?:saved|stored|persisted|succeeded)|"
                r"returns? (?:the )?(?:new )?memory[_ ]?id|read[- ]back (?:check|verification|after (?:the )?write)|"
                r"verif(?:y|ies) (?:that )?(?:the )?(?:write|memory) (?:landed|persisted|was saved)|写入回执|写入确认")
WRITER_PATS = {
    "background": (r"后台|异步|子 agent|子模型|小模型|自动摘要任务|钩子自动|自动采集|自动捕获",
                   r"background (?:extraction|worker|process|job|pass|summari|consolidation)|asynchronous(?:ly)? (?:extract|process|summari)|"
                   r"cheaper model|small(?:er)? model (?:extracts|summari)|auto-captur|automatically captur|capture hook|"
                   r"hooks? captures?|extraction (?:model|pipeline|worker)"),
    "chat_agent": (r"主窗口[^。；]{0,10}(?:写|调用)|AI 主动写|模型自己决定(?:何时|什么时候)记|调用 write",
                   r"(?:the )?(?:agent|model|assistant|Claude) (?:decides|chooses) (?:when|what) to (?:remember|save|store)|"
                   r"calls? (?:the )?(?:save|remember|store|write)_?\w* tool|memory_(?:add|save|store|write)\b|remember\(|save_memory|add_memory"),
    "user": (r"亲手撰写|手动添加|手写|你亲手|由你决定记什么|人工录入",
             r"(?:you|users?) (?:write|curate|add) (?:the |your )?memor(?:y|ies) (?:yourself|by hand|manually)|manually add (?:a )?memor|"
             r"you decide what(?:'s| is)? (?:important|to remember)|hand-written"),
}

REMOTE_MCP_PATS = (r"远程 MCP|远程连接器|HTTP MCP|claude\.ai 网页",
                   r"remote MCP|streamable[- ]?HTTP|custom connectors?|mcp-remote|OAuth 2|HTTP transport|--http\b|"
                   r"remote (?:connector|server URL)|远程 MCP")
TUNNEL_PATS = (r"Cloudflare Tunnel|Tailscale|内网穿透|ZeroTier|ngrok|frp",
               r"Cloudflare Tunnel|cloudflared|Tailscale|ngrok|\bfrp\b|ZeroTier|内网穿透")
LOCAL_MODEL_PATS = (r"Ollama|LM Studio|本地模型|本地向量模型|llama\.cpp|vLLM",
                    r"\bOllama\b|LM Studio|llama\.cpp|\bvLLM\b|local (?:LLM|model)s?\b|本地模型|本地 Ollama|"
                    r"OPENAI_BASE_URL|OpenAI[- ]compatible (?:endpoint|API|server|base URL|provider)")
CLAUDE_ONLY_PATS = (r"只支持 Claude|仅支持 Claude|只用 Claude|仅 Claude|只接 Claude",
                    r"only (?:supports?|works? with) Claude|Claude[- ]only|requires? (?:a )?Claude (?:Pro|Max|subscription)")
# 手机入口直接可用的宿主
PHONE_HOSTS = ("astrbot", "telegram", "wechat", "feishu", "discord", "kelivo", "sillytavern")

# 项目定位：按收录类别给默认值；“可接入已有助手”里不是完整记忆系统的，在这里逐个指定
ROLE_BY_CATEGORY = {"自带记忆的应用": "companion_app", "教程与搭建指南": "guide",
                    "边缘项（存的不是对话记忆）": "state_engine", "需写代码（开发者向）": "dev_framework"}
ROLE_OVERRIDE = {
    "0compactmem": ("context_tool", "管理当前会话的上下文，压缩后恢复工作集"),
    "claude-handoff": ("context_tool", "把会话整理成交接文件"),
    "context-slim": ("context_tool", "清理会话文件，让长窗口续下去"),
    "forge-reload": ("context_tool", "长对话续接到新会话"),
    "extension-summaryception": ("context_tool", "分层摘要压缩聊天上下文"),
    "sillytavern-messagesummarize": ("context_tool", "逐条摘要注入上下文"),
    "rolling-memory": ("context_tool", "滑出窗口的消息结算成摘要注回"),
    "tokenmizer": ("context_tool", "上下文满了时回放会话要点"),
    "remembra": ("context_tool", "会话结束时保存交接记录"),
    "llmcompressor": ("context_tool", "把对话折叠成要点贴进系统提示"),
    "weighted-compact": ("context_tool", "生成会话回顾"),
    "sillytavern-presence": ("context_tool", "控制群聊里各角色看得到哪些消息"),
    "timeline-memory": ("context_tool", "把一段聊天按章节摘要，按话题取回"),
    "dylan-heartbeat": ("context_tool", "维护对话时间线和主动唤醒"),
    "cyberboss": ("context_tool", "把编程助手接进微信并保持上下文"),
    "pilulier": ("context_tool", "一次性行为提示，不存记忆"),
    "claude-find": ("memory_component", "只做历史对话检索"),
    "lore": ("memory_component", "只做历史对话检索"),
    "longhand": ("memory_component", "只做历史对话检索"),
    "memocall": ("memory_component", "只做历史对话检索"),
    "claudex": ("memory_component", "历史对话浏览与检索"),
    "vecthare": ("memory_component", "只做聊天历史的检索"),
    "mnemostack": ("memory_component", "只做检索层"),
    "insight": ("memory_component", "只管写入端的同意和筛选"),
    "synapse": ("memory_component", "只做导入旧聊天记录、建档案"),
    "machine-studio": ("memory_component", "把技术记忆从情感记忆里拆出来，配合 Ombre Brain 用"),
    "astrbot-plugin-self-learning": ("memory_component", "只学说话风格和群友关系"),
    "astrbot-plugin-proactive-chat": ("memory_component", "只做主动消息，记忆只是辅助"),
    "respark": ("memory_component", "把聊天记录训练进本地模型"),
}

# 要先有另一个项目才能用：id -> 依赖的项目（不含用户本来就在用的聊天宿主）
DEPENDS = {
    "tidefall": "Eventide（周期和事件设定来自它）",
    "swap-tutorial": "LMC-5 的精炼续窗脚本",
    "ai-companion-telegram-guide": "MochiBot",
}
# 情绪处理：规则没覆盖到、Claude 读说明后补的：id -> ([值], 依据)
EMOTION_MANUAL = {
    "astrbot-plugin-private-companion": (["ai_state"], "README：角色“会生情绪”，有持续的角色状态"),
    "astrbot-plugin-proactive-chat": (["ai_state"], "主动消息带“动态情绪”"),
    "astrbot-plugin-self-learning": (["ai_state"], "有 Bot 情绪和好感度状态（/set_mood）"),
    "being": (["tags"], "情节记忆按“谁、什么、何时、何地、情绪”结构存"),
    "ki-co": (["tags"], "日记记忆里记录情绪"),
    "lmc-5": (["tags", "weighting"], "召回有独立的 Russell 情绪通道"),
    "sapphire": (["ai_state"], "提示词里有可动态变化的情绪段"),
    "synthetic-heart": (["ai_state"], "情绪随时间衰减"),
    "utsuwa": (["ai_state"], "心情会随互动演化"),
    "vcptoolbox": (["weighting"], "联想沿情感脉络浮现记忆"),
    "vecthare": (["weighting"], "可按角色情绪触发召回片段"),
}
# 明确说明设计上和别的记忆项目一起用（README 没写成能匹配的句子时在这里补）：id -> 说明
PAIRS = {
    "machine-studio": "说明里写可与 Ombre Brain 配合",
    "ombre-brain": "被心潮·念等项目复用",
}
# 推荐引擎做组合推荐用：项目 id -> [(搭配的项目 id, 说明)]。双向关系只写一边，normalize 会补另一边
RELATED = {
    "machine-studio": [("ombre-brain", "技术记忆单独放 Machine Studio，情感和日常记忆放 Ombre Brain（作者就是为配合它写的）")],
    "xinchao-nian": [("ombre-brain", "心潮·念的驱力引擎和 Ombre Brain 的记忆合并发行")],
    "astrbot-plugin-self-learning": [("astrbot-plugin-livingmemory", "作者推荐搭配 LivingMemory 长期记忆插件")],
    "rolling-memory": [("lmc-5", "作者说明可和 LMC-5 这类外置记忆库一起用，负责紧接着的对话衔接")],
    "tidefall": [("eventide", "Tidefall 的周期和事件设定来自 Eventide")],
    "swap-tutorial": [("lmc-5", "教程用的是 LMC-5 的精炼续窗脚本")],
    "ai-companion-telegram-guide": [("mochibot", "教程基于 MochiBot")],
}

# 命中经核对不算的（README 和说明文字都适用）：(id, 字段, 值) -> 原因
REJECT = {
    # ranking_signals
    ("0compactmem", "ranking_signals", "recency"): "对比表里的一格",
    ("archon-memory-core", "ranking_signals", "recency"): "说的是不靠新旧",
    ("astrbot-plugin-proactive-chat", "ranking_signals", "recency"): "数据新鲜度指界面同步",
    ("eros-engine", "ranking_signals", "recency"): "随时间回落的是情绪状态，不是记忆排序",
    ("inspeximus", "ranking_signals", "recency"): "说的是按新旧排序做不到的事",
    ("llmcompressor", "ranking_signals", "recency"): "说的是不做排序",
    ("memorybear", "ranking_signals", "recency"): "说的是模型注意力的偏差",
    ("midas", "ranking_signals", "recency"): "评测的对照基线",
    ("personal-understanding", "ranking_signals", "recency"): "修补记录里的旧问题",
    ("swap-tutorial", "ranking_signals", "recency"): "是作者自家系统的部件，不在教程范围",
    ("weighted-compact", "ranking_signals", "recency"): "评测的对照基线",
    ("ayushagrawal288-memex", "ranking_signals", "importance"): "路线图里还没做",
    ("connectome-host", "ranking_signals", "importance"): "salience 指注入位置",
    ("alaya", "ranking_signals", "frequency"): "对比表里别的项目",
    ("emotion-system", "ranking_signals", "frequency"): "说的是调用模型的频率",
    ("eventide", "ranking_signals", "frequency"): "“热度”是身体数值",
    ("piia-engram", "ranking_signals", "confidence"): "trust level 指访问权限",
    ("sapphire", "ranking_signals", "confidence"): "trust level 指插件信任",
    ("weighted-compact", "ranking_signals", "confidence"): "说的是各部分不互相借信",
    ("companion-emergence", "ranking_signals", "emotion"): "arousal 是 AI 的身体情绪状态（已算情绪状态）",
    ("openher", "ranking_signals", "emotion"): "唤醒度是 AI 的情绪温度（已算情绪状态）",
    ("archon-memory-core", "ranking_signals", "relation"): "在和 Zep 作比较",
    ("central-intelligence", "ranking_signals", "relation"): "评测表的列名",
    ("claude-handoff", "ranking_signals", "relation"): "说的是代码的知识图谱",
    ("inspeximus", "ranking_signals", "relation"): "说的是它不做的东西",
    ("mnemo-mcp", "ranking_signals", "relation"): "说的是作者另一个项目",
    ("openviking", "ranking_signals", "relation"): "说的是可以整理成的产出形式",
    ("paramecium", "ranking_signals", "relation"): "关系图谱保留可查，但不参与排名",
    ("shadowgraph", "ranking_signals", "relation"): "命中的是命令名",
    ("supermemory", "ranking_signals", "relation"): "评测题型名称",
    # scoring_stages
    ("aurasdk", "scoring_stages", "forget"): "说的是不用这些信号做衰减",
    # emotion_handling
    ("dreams", "emotion_handling", "ai_state"): "是可删的示例代码",
    ("dylan-heartbeat", "emotion_handling", "ai_state"): "路线图里还没做",
    ("zenbrain", "emotion_handling", "ai_state"): "在介绍别人的研究",
    ("companion-emergence", "emotion_handling", "tags"): "arousal 是 AI 的身体情绪状态，不是给记忆打标签",
    ("drivesoid", "emotion_handling", "tags"): "arousal 用来决定是否整合（已算情绪加权）",
    ("openher", "emotion_handling", "tags"): "唤醒度是 AI 的情绪温度，不是给记忆打标签",
    # pairing：sidecar 多指技术上的附属进程或文件
    ("agentic-recall", "pairing", "designed_to_pair"): "sidecar 指附属进程或文件",
    ("atmem", "pairing", "designed_to_pair"): "sidecar 指附属进程或文件",
    ("aurasdk", "pairing", "designed_to_pair"): "sidecar 指附属进程或文件",
    ("birkin-mnemosyne", "pairing", "designed_to_pair"): "sidecar 指附属进程或文件",
    ("bitterbot-desktop", "pairing", "designed_to_pair"): "sidecar 指附属进程或文件",
    ("cometline", "pairing", "designed_to_pair"): "sidecar 指附属进程或文件",
    ("facthouse", "pairing", "designed_to_pair"): "sidecar 指附属进程或文件",
    ("goodmemory", "pairing", "designed_to_pair"): "sidecar 指附属进程或文件",
    ("hbarefoot-engram", "pairing", "designed_to_pair"): "sidecar 指附属进程或文件",
    ("inspeximus", "pairing", "designed_to_pair"): "sidecar 指附属进程或文件",
    ("lmc-5", "pairing", "designed_to_pair"): "sidecar 指附属进程或文件",
    ("memu", "pairing", "designed_to_pair"): "sidecar 指附属进程或文件",
    ("mnemo-cortex", "pairing", "designed_to_pair"): "sidecar 指附属进程或文件",
    ("piia-engram", "pairing", "designed_to_pair"): "sidecar 指附属进程或文件",
    ("resonant", "pairing", "designed_to_pair"): "sidecar 指附属进程或文件",
    ("roampal-core", "pairing", "designed_to_pair"): "sidecar 指附属进程或文件",
    ("weighted-compact", "pairing", "designed_to_pair"): "sidecar 指附属进程或文件",
    ("yuralume-core", "pairing", "designed_to_pair"): "sidecar 指附属进程或文件",
    ("everos", "pairing", "designed_to_pair"): "说的是带记忆的电脑操作示例",
    ("0compactmem", "pairing", "designed_to_pair"): "“旁路服务”指挂在 Claude Code 旁运行",
    ("engram-rs", "ranking_signals", "keyword"): "在描述别的方案",
    ("iai-personal-memory-engine", "ranking_signals", "semantic"): "说的是它不是向量库的包装",
    # 第三批字段
    ("moread", "local_model", "yes"): "说的是语音合成接口",
    ("synthetic-heart", "local_model", "yes"): "说的是它自己提供兼容接口",
    ("companion-emergence", "local_model", "yes"): "FAQ 的回答是要用 Claude",
    ("simplemem", "local_model", "yes"): "LM Studio 在这里是聊天客户端",
    ("langstate", "local_model", "yes"): "说的是不需要 Ollama",
    ("memkeeper", "local_model", "yes"): "说的是改用网络服务、不加载本地模型",
    ("mnemo-mcp", "local_model", "yes"): "base_url 是评分服务的配置",
    ("memory-mcp-1file", "phone_access", "remote_mcp"): "说的是没开启 HTTP",
    ("mindmap-mcp-server", "phone_access", "remote_mcp"): "说的是 HTTP 传输默认不提供",
    ("mnemo-mcp", "phone_access", "remote_mcp"): "依赖库列表",
    ("synthetic-heart", "phone_access", "remote_mcp"): "它是去调用别人的远程 MCP",
    ("ocean", "phone_access", "remote_mcp"): "它是去调用别人的 MCP",
    ("atmem", "phone_access", "remote_mcp"): "说的是 agent 之间的委托通道",
    ("mnemo-cortex", "phone_access", "needs_tunnel"): "是一段经历描述",
    ("omega-memory", "model_lock", "claude_only"): "在描述别的产品",
    ("piia-engram", "model_lock", "claude_only"): "对比表里别的产品",
    ("remembra", "model_lock", "claude_only"): "对比表里别的产品",
    # 第二批字段
    ("atmem", "memory_writer", "chat_agent"): "示例是程序代码调用接口，不是聊天的 AI 自己记",
    ("inspeximus", "memory_writer", "chat_agent"): "示例是程序代码调用接口，不是聊天的 AI 自己记",
    ("lightmem", "memory_writer", "chat_agent"): "示例是程序代码调用接口，不是聊天的 AI 自己记",
    ("memoryos", "memory_writer", "chat_agent"): "示例是程序代码调用接口，不是聊天的 AI 自己记",
    ("midas", "memory_writer", "chat_agent"): "示例是程序代码调用接口，不是聊天的 AI 自己记",
    ("mimir", "memory_writer", "chat_agent"): "示例是程序代码调用接口，不是聊天的 AI 自己记",
    ("tstockham96-engram", "memory_writer", "chat_agent"): "示例是程序代码调用接口，不是聊天的 AI 自己记",
    ("python-sdk", "memory_writer", "chat_agent"): "示例是程序代码调用接口，不是聊天的 AI 自己记",
    ("goodmemory", "memory_writer", "chat_agent"): "示例是程序代码调用接口，不是聊天的 AI 自己记",
    ("everos", "memory_writer", "background"): "在描述别的方案",
    ("eros-engine", "memory_writer", "background"): "后台生成的是回复",
    ("ocean", "memory_writer", "background"): "泛指后台任务",
    ("mem9", "memory_writer", "background"): "泛指后台任务",
    ("moread", "memory_writer", "background"): "泛指后台任务",
    ("memory-mcp-1file", "memory_writer", "background"): "是改进提议，还没做",
    ("agentic-recall", "memory_writer", "user"): "说的是手写的规则",
    ("claude-handoff", "memory_writer", "user"): "说的是手写的段落",
    ("llmcompressor", "memory_writer", "user"): "说的是手写规则对比",
    ("tokenmizer", "memory_writer", "user"): "说的是手写的测试会话",
    ("fbisiri-engram", "retrieval_postprocess", "dedup"): "评测用例的名称",
    ("hipocampo", "retrieval_postprocess", "dedup"): "函数列表",
    ("lmc-5", "retrieval_postprocess", "dedup"): "说的是去重是另外的后台任务",
    ("memkeeper", "retrieval_postprocess", "dedup"): "功能列表，没说是检索时",
    ("memos", "retrieval_postprocess", "dedup"): "插件功能列表，没说是检索时",
    ("lmc-5", "retrieval_postprocess", "threshold"): "说的是融合后不设分数下限",
    ("mem0-mcp-selfhosted", "retrieval_postprocess", "threshold"): "说的是建图时的节点匹配",
    ("memora", "retrieval_postprocess", "threshold"): "说的是聚类参数",
    ("connectome-host", "retrieval_postprocess", "budget"): "说的是对话流的预算",
    ("facthouse", "retrieval_postprocess", "budget"): "说的是命令行的预算",
    ("genome", "retrieval_postprocess", "budget"): "评测条件",
    ("longhand", "retrieval_postprocess", "budget"): "说的是费用对比",
    ("memoryconstellations", "retrieval_postprocess", "budget"): "说的是模型思考 token",
    ("mnemo-cortex", "retrieval_postprocess", "budget"): "说的是压缩时分块",
    ("mnemostack", "retrieval_postprocess", "budget"): "说的是模型思考 token",
    ("vecthare", "retrieval_postprocess", "budget"): "在描述问题",
    ("pawwake", "retrieval_postprocess", "rerank"): "“重排”指重新编号",
    ("context-memory", "memory_layers", "layered"): "两级指检索步骤，不是记忆分层",
    ("lightmem", "memory_layers", "layered"): "是另一篇论文的新闻",
    ("basic-memory", "memory_layers", "flat"): "说的是收费方案没有档位",
    ("connectome-host", "sensitive_suppression", "yes"): "说的是配置过滤列表",
    ("swap-tutorial", "sensitive_suppression", "yes"): "是作者自家系统的部件，不在教程范围",
    ("birkin-mnemosyne", "chinese_support", "zh_retrieval"): "说的是没测过中文",
    ("celiums-memory", "chinese_support", "zh_retrieval"): "只是可选的模型之一",
    ("forge-reload", "chinese_support", "zh_retrieval"): "说的是 token 估算",
    ("goodmemory", "chinese_support", "zh_retrieval"): "只是可选的模型之一",
    ("lore", "chinese_support", "zh_retrieval"): "说的是 token 估算",
    ("memora", "chinese_support", "zh_retrieval"): "只是可选的模型之一",
    ("memory-mcp-1file", "chinese_support", "zh_retrieval"): "只是可选的模型之一",
    ("memoryos", "chinese_support", "zh_retrieval"): "只是新增支持的模型之一",
    ("weighted-compact", "chinese_support", "zh_retrieval"): "只是可选的模型之一",
    ("yuralume-core", "chinese_support", "zh_retrieval"): "说的是 token 估算",
    ("alaya", "recall_uses_llm", "no_llm"): "说的是整合时不用大模型",
    ("extension-summaryception", "recall_uses_llm", "no_llm"): "说的是摘要晋升",
    ("gbrain", "recall_uses_llm", "no_llm"): "说的是自动建链接",
    ("memora", "recall_uses_llm", "no_llm"): "说的是生成摘要",
    ("memoryconstellations", "recall_uses_llm", "no_llm"): "说的是后台轻量模式",
    ("midas", "recall_uses_llm", "no_llm"): "说的是写入时",
    ("mindmap-mcp-server", "recall_uses_llm", "no_llm"): "说的是生成建议",
    ("mnemo-cortex", "recall_uses_llm", "no_llm"): "说的是写入分层",
    ("mnemos", "recall_uses_llm", "no_llm"): "说的是对比脚本",
    ("reme", "recall_uses_llm", "no_llm"): "说的是主动话题",
    ("synapse", "recall_uses_llm", "no_llm"): "说的是建索引",
    ("telemem", "recall_uses_llm", "no_llm"): "说的是存原文",
    ("text2mem", "recall_uses_llm", "no_llm"): "说的是测试用的模拟模式",
    ("mempalace", "recall_uses_llm", "llm"): "评测表里的一种配置",
    # customization
    ("0compactmem", "customization", "small_code"): "只是某个部件或文件小，不是整个项目",
    ("agentic-recall", "customization", "small_code"): "只是某个部件或文件小，不是整个项目",
    ("aurasdk", "customization", "small_code"): "只是某个部件或文件小，不是整个项目",
    ("birkin-mnemosyne", "customization", "small_code"): "只是某个部件或文件小，不是整个项目",
    ("causal-memory", "customization", "small_code"): "只是某个部件或文件小，不是整个项目",
    ("claude-imprint", "customization", "small_code"): "只是某个部件或文件小，不是整个项目",
    ("context-memory", "customization", "small_code"): "只是某个部件或文件小，不是整个项目",
    ("facthouse", "customization", "small_code"): "只是某个部件或文件小，不是整个项目",
    ("hipocampo", "customization", "small_code"): "只是某个部件或文件小，不是整个项目",
    ("keep-the-crow", "customization", "small_code"): "只是某个部件或文件小，不是整个项目",
    ("ki-co", "customization", "small_code"): "只是某个部件或文件小，不是整个项目",
    ("memory-mcp-1file", "customization", "small_code"): "只是某个部件或文件小，不是整个项目",
    ("memoryconstellations", "customization", "small_code"): "只是某个部件或文件小，不是整个项目",
    ("memtether", "customization", "small_code"): "只是某个部件或文件小，不是整个项目",
    ("mnemo-cortex", "customization", "small_code"): "只是某个部件或文件小，不是整个项目",
    ("openmemory", "customization", "small_code"): "只是某个部件或文件小，不是整个项目",
    ("roampal-core", "customization", "small_code"): "只是某个部件或文件小，不是整个项目",
    ("sapphire", "customization", "small_code"): "只是某个部件或文件小，不是整个项目",
    ("shadowgraph", "customization", "small_code"): "只是某个部件或文件小，不是整个项目",
    ("synthetic-heart", "customization", "small_code"): "只是某个部件或文件小，不是整个项目",
    ("vecthare", "customization", "small_code"): "只是某个部件或文件小，不是整个项目",
    ("ayushagrawal288-memex", "customization", "small_code"): "只是某个部件或文件小，不是整个项目",
    ("cometline", "customization", "prompts"): "说的是斜杠命令模板，不是记忆用的提示词",
    ("claude-mem", "customization", "plugin_api"): "说的是不注册插件钩子",
    ("claude-soul", "customization", "plugin_api"): "说的是 Claude Code 的扩展点",
    ("claudex", "customization", "plugin_api"): "路线图里还没做",
    ("memex-lab-memex", "customization", "plugin_api"): "路线图里还没做",
    ("memori", "customization", "plugin_api"): "它本身是插件，不提供扩展接口",
    ("memory-lancedb-pro", "customization", "plugin_api"): "说的是 OpenClaw 的插件架构",
    ("memory-mcp", "customization", "plugin_api"): "说的是 Claude Code 钩子",
    ("psycheros", "customization", "plugin_api"): "只是可换模型",
    ("yuralume-core", "customization", "plugin_api"): "只是可换语音服务",
    ("context-keeper", "customization", "settings_ui"): "说的是云厂商控制台",
    ("memoryos", "customization", "settings_ui"): "对比表里别的产品",
    ("weighted-compact", "customization", "settings_ui"): "说的是它没有配置界面",
}
