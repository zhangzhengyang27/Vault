-- 2026-09-14 知识库重组
-- 1) AI Agent 从零实战：56 篇「其他」按章节归类，并开启学习路径
--    （导入时标题按字符串排序导致章节号与 id 错位，分类边界按 id 区间切分，
--      保证每个分组内部 id 顺序 = 章节顺序）
-- 2) 合并：Agent(6 篇) 并入 AI Agent 从零实战；大模型(9 篇) 并入 Happy-LLM；
--    提示词库 3 篇跑题文档移入通用桶（knowledge_base 置 NULL）
-- 3) 清空所有知识库对「其他」分类的引用（原 77 篇全部归类）
-- 4) 通用文章桶补元数据；删除已清空知识库的元数据行

BEGIN;

-- ============ 新分类（slug 沿用 kb-<hex> 模式） ============
INSERT INTO categories (slug, name, "parentId", "sortOrder") VALUES
  -- AI Agent 从零实战（课程主线，sortOrder 100 起）
  ('kb-3f8a21c95d', '课程导论与技术选型',        NULL, 100),
  ('kb-7b42e91fa0', 'RAG 与低代码平台',          NULL, 103),
  ('kb-a18c4d6e2b', 'LangChain 开发基础',        NULL, 106),
  ('kb-5d93f708ac', 'Agent、MCP 与 LangGraph',   NULL, 109),
  ('kb-c26e81b457', '深度研搜实战(上)',          NULL, 112),
  ('kb-904df1a3e6', '深度研搜实战(下)',          NULL, 115),
  ('kb-47c2b8e19f', '电商问数实战(一)项目架构',   NULL, 118),
  ('kb-e5a70c3d82', '电商问数实战(二)数据接入',   NULL, 121),
  ('kb-1f63d9a5b8', '电商问数实战(三)元数据知识库', NULL, 124),
  ('kb-8b04e7c2f1', '电商问数实战(四)问数工作流', NULL, 127),
  ('kb-d29a5f0c73', '延伸阅读',                  NULL, 130),
  -- Happy-LLM（课程章节，sortOrder 140 起）
  ('kb-6e81c3a94b', '前言与准备',                NULL, 140),
  ('kb-a5c7f209d1', '模型原理',                  NULL, 143),
  ('kb-3b96e0d4c8', '训练与对齐实践',            NULL, 146),
  ('kb-f14a8c62e9', '应用与强化学习',            NULL, 149),
  -- 原大模型库并入 Happy-LLM 的延伸内容
  ('kb-7d30b5e18c', '原理与行业视野',            NULL, 152),
  ('kb-92e6a4c0f3', '工程与产品实践',            NULL, 155),
  -- LLM 应用开发实战（sortOrder 160 起）
  ('kb-05c8d1f37a', 'LLM 应用开发基础',          NULL, 160),
  ('kb-c47e92a5b6', 'RAG 与知识库项目',          NULL, 163),
  ('kb-8a1f6d03ce', '评估与综合案例',            NULL, 166);

-- ============ AI Agent 从零实战：按章节归类 ============
UPDATE articles SET category_id = (SELECT id FROM categories WHERE slug='kb-3f8a21c95d')
  WHERE id IN (264,265,266,292);                     -- 1-1、1-2、1-3、9 LangChain 概述
UPDATE articles SET category_id = (SELECT id FROM categories WHERE slug='kb-7b42e91fa0')
  WHERE id IN (277,286,287,288,289,290,291);         -- 2 RAG 实战、3-8 Coze/Dify/企业部署
UPDATE articles SET category_id = (SELECT id FROM categories WHERE slug='kb-a18c4d6e2b')
  WHERE id BETWEEN 267 AND 276;                      -- 10-19 LangChain 核心
UPDATE articles SET category_id = (SELECT id FROM categories WHERE slug='kb-5d93f708ac')
  WHERE id BETWEEN 278 AND 285;                      -- 20-27 MCP/Agent/LangGraph/Skills
UPDATE articles SET category_id = (SELECT id FROM categories WHERE slug='kb-c26e81b457')
  WHERE id IN (293,296,297,298,299,300,301,302,303); -- 深度研搜 1-9
UPDATE articles SET category_id = (SELECT id FROM categories WHERE slug='kb-904df1a3e6')
  WHERE id IN (294,295);                             -- 深度研搜 10-11
UPDATE articles SET category_id = (SELECT id FROM categories WHERE slug='kb-47c2b8e19f')
  WHERE id IN (304,305,313,314,315);                 -- 电商问数 前言、1-4
UPDATE articles SET category_id = (SELECT id FROM categories WHERE slug='kb-e5a70c3d82')
  WHERE id IN (316,320);                             -- 电商问数 5-6
UPDATE articles SET category_id = (SELECT id FROM categories WHERE slug='kb-1f63d9a5b8')
  WHERE id IN (317,318,319);                         -- 电商问数 7-9
UPDATE articles SET category_id = (SELECT id FROM categories WHERE slug='kb-8b04e7c2f1')
  WHERE id BETWEEN 306 AND 312;                      -- 电商问数 10-16

-- ============ Agent 库 6 篇并入：延伸阅读 ============
UPDATE articles SET category_id = (SELECT id FROM categories WHERE slug='kb-d29a5f0c73')
  WHERE knowledge_base = 'Agent';

-- ============ Happy-LLM：课程章节归类 ============
UPDATE articles SET category_id = (SELECT id FROM categories WHERE slug='kb-6e81c3a94b')
  WHERE id IN (243,244);
UPDATE articles SET category_id = (SELECT id FROM categories WHERE slug='kb-a5c7f209d1')
  WHERE id BETWEEN 245 AND 248;
UPDATE articles SET category_id = (SELECT id FROM categories WHERE slug='kb-3b96e0d4c8')
  WHERE id IN (249,250,251);
UPDATE articles SET category_id = (SELECT id FROM categories WHERE slug='kb-f14a8c62e9')
  WHERE id IN (252,262);

-- ============ 大模型 9 篇并入 Happy-LLM：两个延伸分组 ============
UPDATE articles SET category_id = (SELECT id FROM categories WHERE slug='kb-7d30b5e18c')
  WHERE id IN (370,371,372,373,374);
UPDATE articles SET category_id = (SELECT id FROM categories WHERE slug='kb-92e6a4c0f3')
  WHERE id IN (375,376,377,378);

-- ============ LLM 应用开发实战：10 篇「其他」归类 ============
UPDATE articles SET category_id = (SELECT id FROM categories WHERE slug='kb-05c8d1f37a')
  WHERE id IN (172,173,182);
UPDATE articles SET category_id = (SELECT id FROM categories WHERE slug='kb-c47e92a5b6')
  WHERE id IN (174,175,176,177,179);
UPDATE articles SET category_id = (SELECT id FROM categories WHERE slug='kb-8a1f6d03ce')
  WHERE id IN (178,180);

-- ============ 知识库合并与清理 ============
UPDATE articles SET knowledge_base = 'AI Agent 从零实战' WHERE knowledge_base = 'Agent';
UPDATE articles SET knowledge_base = 'Happy-LLM 大模型原理与实践' WHERE knowledge_base = '大模型';
-- 提示词库跑题文档移入通用桶
UPDATE articles SET knowledge_base = NULL WHERE id IN (365, 367, 369);

-- ============ 知识库元数据 ============
UPDATE knowledge_bases SET is_path = true WHERE name = 'AI Agent 从零实战';
DELETE FROM knowledge_bases WHERE name IN ('Agent', '大模型');
INSERT INTO knowledge_bases (name, description, is_path, sort_order)
VALUES ('通用文章', '暂未归入专题知识库的文章合集，覆盖 AI 学习方法、工具实践与行业观察。', false, 90);

COMMIT;
