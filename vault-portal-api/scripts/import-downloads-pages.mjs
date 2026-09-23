#!/usr/bin/env node
/**
 * 批次 2:将「AI 生成的页面」目录中的 30 个网页整理进「网页生成提示词」分类。
 * - 16 个 CodeBuddy 实战课示例页(cb01-cb16,提示词提取自课程讲义)
 * - 14 个独立项目(公司官网/博客/DeepSeek 登录/原型页/演示页等)
 * - 番茄钟页面已按 README 设计规格优化重写
 * 幂等:slug 已存在则跳过。演示文件已复制到 public/demos/。
 */
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const PROMPT_DIR = path.join(import.meta.dirname, "test-prompts");
const env = fs.readFileSync(path.join(import.meta.dirname, "..", ".env"), "utf8");
const DATABASE_URL = env.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim();

const P = (slug) => path.join(PROMPT_DIR, slug + ".md");

const PROJECTS = [
  // ── CodeBuddy 实战课示例系列(cb01-cb16) ──
  { slug: "cb01-countdown", title: "倒计时工具 · CodeBuddy 实战课 01", desc: "课程入门示例:输入目标日期,实时显示剩余天/时/分,渐变蓝背景大数字。", demo: "/demos/cb01-countdown.html" },
  { slug: "cb02-customer-form", title: "客户信息收集表单 · CodeBuddy 实战课 02", desc: "课程示例:客户信息收集表单,字段校验与提交反馈,教学级表单范式。", demo: "/demos/cb02-customer-form.html" },
  { slug: "cb03-password-generator", title: "随机密码生成器 · CodeBuddy 实战课 03", desc: "课程示例:密码长度/字符集可选,一键生成高强度密码并复制。", demo: "/demos/cb03-password-generator.html" },
  { slug: "cb04-bill-analysis", title: "消费账单分析 · CodeBuddy 实战课 04", desc: "课程示例:粘贴账单数据,自动分类汇总并可视化消费结构。", demo: "/demos/cb04-bill-analysis.html" },
  { slug: "cb05-qrcode-generator", title: "二维码生成器 · CodeBuddy 实战课 05", desc: "课程示例:文本/链接转二维码,尺寸与纠错级别可选,即扫即用。", demo: "/demos/cb05-qrcode-generator.html" },
  { slug: "cb06-table-merge", title: "多表合并工具 · CodeBuddy 实战课 06", desc: "课程示例:多份表格数据粘贴合并,按关键列去重对齐。", demo: "/demos/cb06-table-merge.html" },
  { slug: "cb07-batch-rename", title: "批量重命名工具 · CodeBuddy 实战课 07", desc: "课程示例:文件名批量加前缀/后缀/序号替换,改名预览确认。", demo: "/demos/cb07-batch-rename.html" },
  { slug: "cb08-pdf-toolbox", title: "PDF 工具箱 · CodeBuddy 实战课 08", desc: "课程示例:PDF 合并/拆分/压缩的轻量前端工具集。", demo: "/demos/cb08-pdf-toolbox.html" },
  { slug: "cb09-bookkeeping", title: "极简记账 · CodeBuddy 实战课 09", desc: "课程示例:收支记录与分类汇总,极简记账流程。", demo: "/demos/cb09-bookkeeping.html" },
  { slug: "cb10-bill-split", title: "合租账单分摊 · CodeBuddy 实战课 10", desc: "课程示例:合租房租/水电/网费按人头分摊,谁该给谁多少钱一目了然。", demo: "/demos/cb10-bill-split.html" },
  { slug: "cb11-home-inventory", title: "家庭物品管理 · CodeBuddy 实战课 11", desc: "课程示例:家庭物品登记与位置索引,找东西不再翻箱倒柜。", demo: "/demos/cb11-home-inventory.html" },
  { slug: "cb12-product-mgmt", title: "商品管理 · CodeBuddy 实战课 12", desc: "课程示例:轻量商品进销存管理,库存与价格一览。", demo: "/demos/cb12-product-mgmt.html" },
  { slug: "cb13-marketing-content", title: "营销内容生成 · CodeBuddy 实战课 13", desc: "课程示例:按渠道与卖点生成营销文案模板。", demo: "/demos/cb13-marketing-content.html" },
  { slug: "cb14-customer-crm", title: "客户管理 · CodeBuddy 实战课 14", desc: "课程示例:轻量客户 CRM,联系人/跟进记录与状态管理。", demo: "/demos/cb14-customer-crm.html" },
  { slug: "cb15-dashboard-generator", title: "数据看板生成器 · CodeBuddy 实战课 15", desc: "课程示例:粘贴数据自动生成图表看板。", demo: "/demos/cb15-dashboard-generator.html" },
  { slug: "cb16-side-income-calc", title: "副业收入计算器 · CodeBuddy 实战课 16", desc: "课程示例:副业收入/成本/时间投入的综合收益测算。", demo: "/demos/cb16-side-income-calc.html" },
  // ── 独立项目 ──
  { slug: "company-website-nexus", title: "Nexus Digital · 公司官网", desc: "数字化解决方案公司官网:渐变 Hero、服务矩阵与案例区,单页官网范式。", demo: "/demos/company-website-nexus.html" },
  { slug: "personal-blog-quiet", title: "静谧角落 · 个人博客首页", desc: "极简个人博客首页:文章列表、分类与关于区,留白舒适的阅读气质。", demo: "/demos/personal-blog-quiet.html" },
  { slug: "deepseek-login", title: "DeepSeek 开放平台登录页 · 1:1 还原", desc: "像素级还原 DeepSeek 开放平台登录页:品牌 Logo SVG、登录卡片与响应式布局。", demo: "/demos/deepseek-login.html" },
  { slug: "wordcard-app-prototype", title: "单词卡片 App · 安卓落地版原型", desc: "背单词 App 可交互原型:翻转卡片、学习队列、统计与 Material 风格组件。", demo: "/demos/wordcard-app-prototype.html" },
  { slug: "poem-app-prototype", title: "古诗词应用 · 新中式原型", desc: "古诗词学习 App 原型:竖排诗句卡、注释赏析分栏与收藏流程,宣纸新中式美学。", demo: "/demos/poem-app-prototype.html" },
  { slug: "claude4-presentation", title: "Claude 4 & Agent 能力 · 网页演示文稿", desc: "键盘翻页的网页幻灯片:Claude 4 模型与 Agent 能力矩阵介绍,深色科技风。", demo: "/demos/claude4-presentation.html" },
  { slug: "lever-principle-demo", title: "杠杆原理 · 交互教学演示", desc: "物理教学交互页:拖拽砝码与力臂,实时演示 F1×L1=F2×L2 平衡条件。", demo: "/demos/lever-principle-demo.html" },
  { slug: "link-game", title: "欢乐连连看", desc: "经典连连看网页游戏:BFS 连通判定、连击计分、提示/洗牌道具与多关卡。", demo: "/demos/link-game.html" },
  { slug: "chengyu-wangyangbulao", title: "成语故事:亡羊补牢 · 互动绘本", desc: "儿童成语学习页:SVG 插画分幕讲故事、互动问答与释义卡,暖色绘本风。", demo: "/demos/chengyu-wangyangbulao.html" },
  { slug: "student-mental-health-report", title: "学生心理健康与在线学习 · 分析报告", desc: "数据报告长文:趋势/对比/占比图表与三方建议,学术排版 + 现代可视化。", demo: "/demos/student-mental-health-report.html" },
  { slug: "md-wx-render-ui", title: "公众号 Markdown 渲染组件 · UI 原型", desc: "公众号排版工具原型:左编辑右预览、多套主题一键切换与样式复制。", demo: "/demos/md-wx-render-ui.html" },
  { slug: "healthy-diet-app", title: "Healthy Diet App · 高保真原型", desc: "健康饮食记录 App 原型:卡路里大数字、三色营养环、餐食时间线与饮水打卡。", demo: "/demos/healthy-diet-app.html" },
  { slug: "admin-dashboard-ui", title: "现代化后台管理系统 · 首页 UI", desc: "科技蓝渐变风后台首页:数据卡、图表区、待办与快捷入口,附完整设计方案。", demo: "/demos/admin-dashboard-ui.html" },
  { slug: "pomodoro-app-ui", title: "番茄钟 APP · UI 设计方案(优化版)", desc: "双屏手机壳展示:粉紫渐变计时器(真实可运行)+ 任务列表页,毛玻璃与进度环。", demo: "/demos/pomodoro-app-ui.html" },
];

const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();

const { rows: catRows } = await client.query(
  `SELECT id FROM categories WHERE slug = 'prompt-web' LIMIT 1`,
);
const categoryId = catRows[0]?.id;
if (!categoryId) {
  console.error("未找到「网页生成」分类");
  process.exit(1);
}

let created = 0;
for (const p of PROJECTS) {
  const { rows: exists } = await client.query(`SELECT id FROM prompts WHERE slug = $1`, [p.slug]);
  if (exists.length > 0) {
    console.log(`↷ ${p.slug} 已存在,跳过`);
    continue;
  }
  const content = fs.readFileSync(P(p.slug), "utf8");
  const { rows } = await client.query(
    `INSERT INTO prompts
       (slug, title, description, content, "optimizedContent", kind,
        category_id, author, phase, source, status, "modelHint", uses)
     VALUES ($1,$2,$3,$4,$4,'precise',$5,'社区精选','v1','manual','published','通用',0)
     RETURNING id`,
    [p.slug, p.title, p.desc, content, categoryId],
  );
  await client.query(
    `UPDATE prompts SET attachments = COALESCE(attachments,'[]'::jsonb) || $1::jsonb WHERE id = $2`,
    [JSON.stringify([{ type: "link", url: p.demo, name: "在线演示" }]), rows[0].id],
  );
  created += 1;
  console.log(`✓ ${p.slug}`);
}
console.log(`\n完成:新增 ${created} 条`);
await client.end();
