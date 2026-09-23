#!/usr/bin/env node
/**
 * 一次性迁移:把「网页生成」分类 17 条提示词中的英文站点文案指令翻译为中文。
 * 只翻译文案指令(H1 口号/导航/信任条/按钮/菜单项/区块标题),
 * 技术指令(代码/CSS/字体名/依赖说明)保留。先备份到 prompts_backup_zh。
 * 用法:node translate-prompt-copy.mjs [--dry]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRY = process.argv.includes('--dry');
const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
const DATABASE_URL = env.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim();
if (!DATABASE_URL) { console.error('未找到 DATABASE_URL'); process.exit(1); }

const R = [
  // ===== 通用导航/按钮 =====
  ['Book a Service', '预约维修'],
  ['Book Appointment', '预约就诊'],
  ['Book a stay', '预订住宿'],
  ['Reserve a Table', '预订餐位'],
  ['Start free', '免费开始'],
  ['Free Consultation', '免费咨询'],
  ['Book a Free Consultation', '预约免费咨询'],
  ['Book Your Free Consultation', '预约您的免费咨询'],
  ['Book Your First Session', '预约首次诊疗'],
  ['View Full Profile', '查看完整档案'],
  ['Check Availability', '查询档期'],
  ['Start a project', '启动项目'],
  ['Start a conversation', '开始对话'],

  // ===== bike-shop =====
  ['WE FIX BIKES. WE ALSO SELL THEM.', '我们修车,也卖车。'],
  ['Bike shop and workshop · Manchester', '自行车店与维修工坊 · 曼彻斯特'],
  ['Safety check £25 / Minor £65 / Major £130 / Custom build from £260', '安全检查 £25 / 小保养 £65 / 大保养 £130 / 定制改装 £260 起'],
  ["name: 'Safety check'", "name: '安全检查'"],
  ["name: 'Minor service'", "name: '小保养'"],
  ["name: 'Major service'", "name: '大保养'"],
  ["name: 'Custom build'", "name: '定制改装'"],
  ["'Brakes','Gears','Tyres','Bolt torque check'", "'刹车','变速','轮胎','螺栓扭矩检查'"],
  ["'Everything in safety check','Gear and brake adjust','Drivetrain clean','Wheel true'", "'含安全检查全部项目','变速与刹车调整','传动清洁','圈校正'"],
  ["'Everything in minor','Full strip and rebuild','New cables and housing','Bearing service'", "'含小保养全部项目','整车拆解重建','更换全线管线','轴承保养'"],
  ["'Frame prep and facing','Full build from parts','Bearing prep and torque log','Two free follow-ups'", "'车架预处理与铣削','散件整车组装','轴承预处理与扭矩记录','两次免费复检'"],

  // ===== coffee-shop =====
  ['`Good Coffee.\\nGood People.\\nGreat Days.`', '`好咖啡。\\n好朋友。\\n好日子。`'],
  ['`Good Coffee. Good People. Great Days.`', '`好咖啡。好朋友。好日子。`'],
  ['Good Coffee. Good People. Great Days.', '好咖啡。好朋友。好日子。'],
  ['What\'s On', '本周推荐'],
  ['From Farm to Cup', '从产地到杯中'],
  ['Shop our beans', '选购咖啡豆'],
  ['Hire the Space', '空间租用'],
  ['Come and Say Hello', '来打个招呼'],
  ['浓缩 from £3.20 · 滤泡 from £3.50 · 早午餐 from £8 · 烘焙 from £2.80', '浓缩 £3.20 起 · 滤泡 £3.50 起 · 早午餐 £8 起 · 烘焙 £2.80 起'],

  // ===== law-firm =====
  ['Counsel You\\nCan Count On', '值得托付的\\n法律顾问'],
  ['Counsel You Can Count On', '值得托付的法律顾问'],
  ['AUSTIN, TEXAS · FOUNDED 1989 · AV PREEMINENT® RATED', '德克萨斯州奥斯汀 · 创立于 1989 年 · AV PREEMINENT® 评级'],
  ['View Full Profile →', '查看完整档案 →'],
  ["Submit — We'll Call Within 24 Hours", '提交 — 24 小时内致电'],
  ['Personal Injury / Family Law / Business Litigation / Criminal Defense / Estate Planning / Employment Law', '人身伤害 / 家事法律 / 商事诉讼 / 刑事辩护 / 遗产规划 / 劳动法'],

  // ===== photography =====
  ['Photography\\nThat Says\\nSomething.', '有态度的\\n摄影作品。'],
  ['Photography That Says Something.', '有态度的摄影。'],
  ['Portrait / Editorial / Brand', '人像 / 编辑 / 品牌'],

  // ===== retail-saas =====
  ['`Your store, **finally** running itself.`', '`你的店铺,**终于**开始自己运转。`'],
  ['Your store, finally running itself.', '你的店铺,终于开始自己运转。'],
  ['`Your store deserves better software.`', '`你的店铺,值得更好的软件。`'],
  ['The operating system for physical retail.', '实体零售的操作系统。'],
  ['Most popular', '最受欢迎'],

  // ===== art-gallery =====
  ['Nine new paintings made over two winters in Jutland, in which the horizon is never quite where you expect it.', '九幅在日德兰两个冬天里完成的全新绘画——地平线从不在你期待的位置。'],
  ['Availability list on request.', '可售清单来函索取。'],

  // ===== boutique-hotel =====
  ['A Place Unlike Any Other.', '一个与众不同的地方。'],
  ['Unlike Any Other.', '与众不同。'],
  ['12 Rooms · Dog Friendly · Restaurant · Free Parking · Cotswolds', '12 间客房 · 可携宠 · 餐厅 · 免费停车 · 科茨沃尔德'],
  ['The Aldwick in Detail', '细看 The Aldwick'],
  ['Is Your Date Available?', '查询你的日期是否可订?'],
  ['See the rooms', '看看客房'],
  ['Everything on the menu was either grown here, reared locally, or foraged from the surrounding countryside.', '菜单上的每一样,要么种在庄园里,要么养在附近,要么采自周边的山野。'],
  ['Classic from £180 · Deluxe from £240 · Suite from £380', '经典房 £180 起 · 豪华房 £240 起 · 套房 £380 起'],
  ['Seasonal tasting menu, locally sourced, open Thu–Sun', '时令品鉴菜单 · 本地食材 · 周四至周日开放'],

  // ===== craft-brewery =====
  ['Brewed with purpose. Poured with pride.', '用心酿造,骄傲出品。'],
  ['See What\'s On Tap', '看看今日酒单'],
  ['Plan Your Visit', '规划到店'],
  ['Tap a card to flip for tasting notes.', '点击卡片翻面,查看品鉴笔记。'],
  ['Independently owned. Never compromised.', '独立经营,绝不妥协。'],

  // ===== designer =====
  ['Product designer crafting', '产品设计师,打造'],
  ['clean & modern designs.', '简洁而现代的设计。'],
  ['Available for hire', '可接受新项目委托'],

  // ===== developer =====
  ['Building apps\\npeople actually use.', '构建人们\\n真正在用的应用。'],
  ['people actually use.', '真正在用的应用。'],

  // ===== finance =====
  ['Your Financial Future,', '你的财务未来,'],
  ['Clarified.', '清晰可见。'],
  ['Independent Financial Advice', '独立财务建议'],
  ['Expert Advice Across Every Area of Your Financial Life', '覆盖你财务生活的每一个领域'],
  ['Retirement Planning', '退休规划'],
  ['Investment Management', '投资管理'],
  ['Protection Insurance', '保障保险'],
  ['A Simple, Transparent Process', '简单、透明的流程'],
  ['Free Initial Consultation', '免费初次咨询'],
  ['Your Personalised Plan', '你的个性化方案'],
  ['Ongoing Partnership', '长期陪伴'],
  ['What Our Clients Say', '客户怎么说'],
  ['Book Your Free Consultation', '预约您的免费咨询'],

  // ===== fine-dining =====
  ['Where Fire\\nMeets Finesse', '炉火与\\n精致的相遇'],
  ['Meets Finesse', '精致的相遇'],

  // ===== health-saas =====
  ['Your health data,', '你的健康数据,'],
  ['finally connected.', '终于互联互通。'],
  ['Trusted by 40,000+ members', '40,000+ 会员信赖'],

  // ===== wedding =====
  ['Where Your Story Begins.', '你的故事,从这里开始。'],
  ['Three Breathtaking Settings', '三处令人屏息的场地'],
  ['The Grand Hall', '大宴会厅'],
  ['The Orangery', '橘园阳光房'],
  ['The Garden Terrace', '花园露台'],
];

const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();

const { rows } = await client.query(`
  SELECT id, slug, title, description, content, "optimizedContent"
  FROM prompts
  WHERE kind='precise' AND slug LIKE 'wsp-%'
`);
console.log('处理行数:', rows.length);

if (!DRY) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS prompts_backup_zh AS
    SELECT id, slug, title, description, content, "optimizedContent"
    FROM prompts WITH NO DATA
  `);
  const ids = rows.map(r => r.id).join(',');
  await client.query(`
    INSERT INTO prompts_backup_zh (id, slug, title, description, content, "optimizedContent")
    SELECT p.id, p.slug, p.title, p.description, p.content, p."optimizedContent"
    FROM prompts p WHERE p.id IN (${ids})
    AND NOT EXISTS (SELECT 1 FROM prompts_backup_zh b WHERE b.slug = p.slug)
  `);
}

let touchedRows = 0, touchedFields = 0;
for (const row of rows) {
  const updates = {};
  for (const field of ['title', 'description', 'content', 'optimizedContent']) {
    const orig = row[field];
    if (!orig) continue;
    let out = orig;
    for (const [from, to] of R) out = out.split(from).join(to);
    if (out !== orig) updates[field] = out;
  }
  if (!Object.keys(updates).length) continue;
  touchedRows += 1;
  touchedFields += Object.keys(updates).length;
  console.log('✎', row.slug, Object.keys(updates).join(','));
  if (!DRY) {
    const sets = Object.keys(updates).map((f, i) => `"${f}" = $${i + 1}`).join(', ');
    await client.query(`UPDATE prompts SET ${sets} WHERE id = $${Object.keys(updates).length + 1}`,
      [...Object.values(updates), row.id]);
  }
}
console.log(`${DRY ? '[dry] ' : ''}变更 ${touchedRows} 行 / ${touchedFields} 字段`);
await client.end();
