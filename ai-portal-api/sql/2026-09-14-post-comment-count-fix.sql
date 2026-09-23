-- 2026-09-14 社区帖子冗余评论计数修复
--
-- posts.comments 是为列表页免聚合查询维护的冗余列，历史上冒烟测试的评论
-- 走过未正确回减的路径，导致计数与实际评论行数脱节（列表页会展示虚高数字）。
-- 统一按 comments 表实际行数回填：
--   兼容两条写入路径（post_id 列 / target_type='post' 的多态列），同一行只计一次。

UPDATE posts p
SET comments = sub.actual
FROM (
  SELECT p2.id AS post_id,
         (SELECT COUNT(*)
          FROM comments c
          WHERE c.post_id = p2.id
             OR (c.target_type = 'post' AND c.target_id = p2.id)) AS actual
  FROM posts p2
) sub
WHERE p.id = sub.post_id
  AND p.comments <> sub.actual;
