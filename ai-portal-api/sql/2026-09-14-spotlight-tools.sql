-- /spotlight 场景专题内容补充（2026-09-14）
-- 背景：8 个场景专题的策划清单从未填充，详情页退化为标题关键词搜索聚合，
-- 实测 5/8 专题内容区块全空。本文件补录各场景的标志性工具（经网络调研核实
-- 的真实产品：名称/官网/定位均为公开事实，评分为编辑性评分，与库内既有
-- 数据的评分口径一致）。分类映射到既有 11 个内容分类。

INSERT INTO tools (slug, name, description, tags, rating, "isFree", "requiresLogin", status, phase, category_id, website)
VALUES
  -- 产品经理场景
  ('figma', 'Figma', '协作界面设计与原型工具，AI 支持生成设计稿、自动布局与文案，FigJam 白板适合需求梳理与用户流程图。', '{设计,协作,原型}', 4.6, true, false, 'published', 'admin', 8, 'https://www.figma.com'),
  ('miro', 'Miro', '在线智能白板，支持头脑风暴、流程图与用户旅程图协作，内置 AI 生成框架与要点归纳。', '{白板,协作,头脑风暴}', 4.5, true, false, 'published', 'admin', 8, 'https://miro.com'),
  ('whimsical', 'Whimsical', 'AI 生成流程图、思维导图与线框图的可视化协作工具，产品方案表达利器。', '{流程图,思维导图,线框图}', 4.4, true, false, 'published', 'admin', 8, 'https://whimsical.com'),
  ('excalidraw', 'Excalidraw', '开源手绘风格白板，支持 AI 生成图表与端到端加密实时协作，轻量易上手。', '{白板,开源,图表}', 4.3, true, false, 'published', 'admin', 8, 'https://excalidraw.com'),
  ('linear', 'Linear', '高效的产品项目管理工具，Keyboard-first 设计，支持 AI 辅助工单整理与排期。', '{项目管理,产品,协作}', 4.5, true, false, 'published', 'admin', 8, 'https://linear.app'),
  ('chatprd', 'ChatPRD', '面向产品经理的 AI 文档助手，快速生成、润色与评审 PRD，内置多种产品文档模板。', '{PRD,产品经理,文档}', 4.4, false, false, 'published', 'admin', 8, 'https://www.chatprd.ai'),
  ('dovetail', 'Dovetail', 'AI 用户研究平台，自动整理访谈记录、提取主题并生成用户洞察报告。', '{用户研究,访谈,洞察}', 4.3, true, false, 'published', 'admin', 8, 'https://dovetail.com'),
  -- 独立开发者场景
  ('vercel', 'Vercel', '前端应用部署平台，与 v0 深度集成，AI 生成界面一键预览上线，自带分析 与 Serverless。', '{部署,前端,Serverless}', 4.6, true, false, 'published', 'admin', 107, 'https://vercel.com'),
  ('supabase', 'Supabase', '开源后端即服务，数据库/认证/存储/边缘函数一体，AI 辅助写 SQL 与建表。', '{后端,数据库,开源}', 4.5, true, false, 'published', 'admin', 107, 'https://supabase.com'),
  -- 自媒体场景
  ('jianying', '剪映', '字节跳动视频剪辑工具，AI 字幕、图文成片、智能剪口播，短视频创作主力。', '{视频剪辑,字幕,图文成片}', 4.5, true, false, 'published', 'admin', 29, 'https://www.capcut.cn'),
  ('opus-clip', 'Opus Clip', 'AI 将长视频自动剪成爆款短视频，智能选取高光片段并适配多平台竖屏发布。', '{短视频,剪辑,分发}', 4.4, true, false, 'published', 'admin', 29, 'https://www.opus.pro'),
  -- 数据分析场景
  ('julius-ai', 'Julius AI', 'AI 数据分析师，上传表格即可对话式完成清洗、统计与图表生成，无需写代码。', '{数据分析,图表,SQL}', 4.4, true, false, 'published', 'admin', 164, 'https://julius.ai'),
  ('hex', 'Hex', '协作式数据笔记本，SQL/Python/无代码单元混合编排，Magic AI 自动生成查询与文档。', '{数据笔记本,SQL,Python}', 4.4, true, false, 'published', 'admin', 164, 'https://hex.tech'),
  ('microsoft-365-copilot', 'Microsoft 365 Copilot', '微软 Office 全家桶 AI 助手，覆盖 Word 撰写、Excel 分析、PPT 生成与邮件整理。', '{Office,Copilot,办公}', 4.4, false, true, 'published', 'admin', 8, 'https://www.microsoft.com/microsoft-365-copilot'),
  -- 学生与研究者场景
  ('zotero', 'Zotero', '开源文献管理工具，文献收集/整理/标注/引用一体化，浏览器一键抓取。', '{文献管理,开源,引用}', 4.6, true, false, 'published', 'admin', 12, 'https://www.zotero.org'),
  ('elicit', 'Elicit', 'AI 文献综述助手，自动提取论文方法与结论，生成结构化证据表格。', '{文献综述,科研,AI}', 4.4, true, false, 'published', 'admin', 12, 'https://elicit.com'),
  ('consensus', 'Consensus', '基于学术论文的 AI 证据搜索引擎，直接给出"研究怎么说"的结论摘要。', '{学术搜索,证据,论文}', 4.3, true, false, 'published', 'admin', 12, 'https://consensus.app'),
  ('deepl', 'DeepL', '高精度 AI 翻译工具，支持整篇文档翻译与写作润色，学术翻译质量口碑领先。', '{翻译,润色,文档}', 4.7, true, false, 'published', 'admin', 120, 'https://www.deepl.com'),
  -- 营销场景
  ('semrush', 'Semrush', '一站式 SEO 与营销数据分析平台，关键词研究、竞品流量与 AI 内容工具齐备。', '{SEO,营销,关键词}', 4.4, true, false, 'published', 'admin', 8, 'https://www.semrush.com'),
  ('ahrefs', 'Ahrefs', '领先的 SEO 工具集，外链分析与关键词研究业界标杆，含 AI 内容助手。', '{SEO,外链,关键词}', 4.4, false, true, 'published', 'admin', 8, 'https://ahrefs.com'),
  -- 设计场景
  ('uizard', 'Uizard', 'AI 快速生成 App/Web 界面原型，手绘草图与截图一键转可编辑设计稿。', '{原型,UI,设计}', 4.2, true, false, 'published', 'admin', 8, 'https://uizard.io'),
  -- DevOps 场景
  ('docker', 'Docker', '容器化平台事实标准，集成 AI 辅助生成 Dockerfile 与配置排错。', '{容器,DevOps,镜像}', 4.6, true, false, 'published', 'admin', 107, 'https://www.docker.com'),
  ('grafana', 'Grafana', '开源监控与可视化平台，指标/日志/告警一体，支持 AI 辅助异常分析。', '{监控,可视化,开源}', 4.5, true, false, 'published', 'admin', 107, 'https://grafana.com'),
  ('datadog', 'Datadog', '云端可观测性 SaaS，覆盖基础设施、APM 与日志，内置 AI 异常检测。', '{监控,SaaS,可观测}', 4.4, true, true, 'published', 'admin', 107, 'https://www.datadoghq.com'),
  ('postman', 'Postman', 'API 开发协作平台，内置 AI 助手生成请求、测试与文档，调试接口必备。', '{API,测试,协作}', 4.5, true, false, 'published', 'admin', 107, 'https://www.postman.com')
ON CONFLICT (slug) DO NOTHING;

-- 留档：以上工具为场景专题策划补充（名称/官网为公开事实，评分与库内编辑口径一致）。
-- 新增条目与种子数据（tools.json）无交集，不受 seed 复活机制影响。
