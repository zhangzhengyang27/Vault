-- 学习资源补来源链接：与 news/skills 的 source_url 同款模式。
-- 资源（课程/书籍/文档）天然是站外内容，详情页此前没有跳转出口。
-- 已用 curl 逐一核实可访问；huggingface.co / tensorflow.org / developers.google.com
-- 在本机网络环境连接失败(000)但 URL 为官方规范地址；platform.openai.com 403 为反爬。
-- ai-pm-camp 无可核实的官方出处，保持 NULL，前端不渲染外链块。
-- 执行时间: 2026-09-14

ALTER TABLE resources ADD COLUMN IF NOT EXISTS source_url VARCHAR(500);

UPDATE resources SET source_url = 'https://www.coursera.org/learn/ai-for-everyone'
  WHERE slug = 'ai-for-everyone';
UPDATE resources SET source_url = 'https://www.promptingguide.ai'
  WHERE slug = 'prompt-engineering-guide';
UPDATE resources SET source_url = 'https://huggingface.co/docs'
  WHERE slug = 'huggingface-tutorial';
UPDATE resources SET source_url = 'https://www.coursera.org/specializations/machine-learning-introduction'
  WHERE slug = 'andrew-ng-ml-specialization';
UPDATE resources SET source_url = 'https://www.coursera.org/specializations/deep-learning'
  WHERE slug = 'deeplearning-ai-specialization';
UPDATE resources SET source_url = 'https://course.fast.ai'
  WHERE slug = 'fastai-practical-deep-learning';
UPDATE resources SET source_url = 'https://zh.d2l.ai'
  WHERE slug = 'dive-into-deep-learning';
UPDATE resources SET source_url = 'https://huggingface.co'
  WHERE slug = 'hugging-face-platform';
UPDATE resources SET source_url = 'https://huggingface.co/learn'
  WHERE slug = 'hugging-face-learn';
UPDATE resources SET source_url = 'https://pytorch.org/tutorials'
  WHERE slug = 'pytorch-tutorials';
UPDATE resources SET source_url = 'https://www.tensorflow.org/tutorials'
  WHERE slug = 'tensorflow-tutorials';
UPDATE resources SET source_url = 'https://developers.google.com/machine-learning/crash-course'
  WHERE slug = 'google-ml-crash-course';
UPDATE resources SET source_url = 'https://www.kaggle.com/learn'
  WHERE slug = 'kaggle-learn';
UPDATE resources SET source_url = 'https://cs231n.stanford.edu'
  WHERE slug = 'stanford-cs231n';
UPDATE resources SET source_url = 'https://introtodeeplearning.com'
  WHERE slug = 'mit-6s191';
UPDATE resources SET source_url = 'https://scikit-learn.org/stable/'
  WHERE slug = 'scikit-learn-docs';
UPDATE resources SET source_url = 'https://learn.microsoft.com/zh-cn/training/browse/?products=azure-ai-services'
  WHERE slug = 'microsoft-learn-ai';
UPDATE resources SET source_url = 'https://platform.openai.com/docs'
  WHERE slug = 'openai-platform-docs';
