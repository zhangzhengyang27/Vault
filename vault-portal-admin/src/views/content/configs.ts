import type { ContentType } from "@/api/admin";

/**
 * 内容管理（ContentManager.vue）的类型与配置：
 * 7 类内容共用一个管理组件，通过 ContentTypeConfig 差异化
 * 列表标题列、表单字段、详情跳转路径等。
 */

/** 表单字段类型 */
export interface FieldDef {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "boolean" | "select" | "tags";
  required?: boolean;
  placeholder?: string;
  /** 独占一行 */
  full?: boolean;
  /** select 类型的选项 */
  options?: Array<{ value: string | number; label: string }>;
}

/** 单类内容的差异化配置 */
export interface ContentTypeConfig {
  /** 内容类型（对应后端 /admin/content/{type}） */
  type: ContentType;
  /** 页面标题 */
  title: string;
  /** 页面描述 */
  description: string;
  /** 标题列字段名（tools 等用 name，文章/资讯用 title） */
  titleField: string;
  /** 门户详情路径：以 "/" 结尾时拼接 slug 跳转，否则为固定链接 */
  detailPath: string;
  /** 新建/编辑表单字段 */
  fields: Array<FieldDef>;
}

/** 内容状态元信息（标签颜色 + 文案） */
export const STATUS_META: Record<string, { label: string; type: "success" | "info" | "warning" | "danger" }> = {
  published: { label: "已发布", type: "success" },
  draft: { label: "草稿", type: "info" },
  pending: { label: "待审核", type: "warning" },
  archived: { label: "已归档", type: "danger" }
};

/** 状态筛选页签 */
export const CONTENT_STATUSES: Array<string> = ["published", "draft"];

/** 门户站点地址（内容管理页「查看」链接跳转用） */
export const PORTAL_URL: string =
  import.meta.env.VITE_PORTAL_URL || "https://portal.example.com";

const TAGS_FIELD: FieldDef = { key: "tags", label: "标签", type: "tags" };
const CATEGORY_FIELD: FieldDef = { key: "categoryId", label: "分类", type: "select" };

/** 7 类内容的差异化配置（router/utils 的组件映射表按 type 取用） */
export const CONTENT_CONFIGS: Record<ContentType, ContentTypeConfig> = {
  tools: {
    type: "tools",
    title: "工具管理",
    description: "维护 AI 工具收录：基本信息、分类、标签与上下架。",
    titleField: "name",
    detailPath: "/tools/",
    fields: [
      { key: "name", label: "名称", type: "text", required: true },
      { key: "slug", label: "Slug", type: "text", placeholder: "留空自动生成" },
      { key: "url", label: "官网地址", type: "text", placeholder: "https://…" },
      CATEGORY_FIELD,
      { key: "description", label: "简介", type: "textarea", full: true, placeholder: "工具简介（支持 Markdown）" },
      TAGS_FIELD,
      { key: "featured", label: "推荐位", type: "boolean" }
    ]
  },
  prompts: {
    type: "prompts",
    title: "提示词管理",
    description: "维护提示词库：提示词正文、适用场景与分类标签。",
    // prompt 实体的标题字段是 title（tools/mcps/repos 才是 name），此前误绑 name
    // 导致列表名称列全空、新建/编辑提交错字段
    titleField: "title",
    detailPath: "/prompts/",
    fields: [
      { key: "title", label: "名称", type: "text", required: true },
      { key: "slug", label: "Slug", type: "text", placeholder: "留空自动生成" },
      CATEGORY_FIELD,
      { key: "description", label: "适用场景", type: "textarea", full: true, placeholder: "说明该提示词的用途与适用场景" },
      { key: "content", label: "提示词正文", type: "textarea", full: true, required: true },
      TAGS_FIELD,
      { key: "featured", label: "推荐位", type: "boolean" }
    ]
  },
  articles: {
    type: "articles",
    title: "文章管理",
    description: "维护知识库文章：正文、摘要、分类与标签。",
    titleField: "title",
    detailPath: "/articles/",
    fields: [
      { key: "title", label: "标题", type: "text", required: true },
      { key: "slug", label: "Slug", type: "text", placeholder: "留空自动生成" },
      CATEGORY_FIELD,
      { key: "coverUrl", label: "封面图", type: "text", placeholder: "https://…/cover.jpg" },
      { key: "summary", label: "摘要", type: "textarea", full: true },
      { key: "content", label: "正文", type: "textarea", full: true, required: true },
      TAGS_FIELD,
      { key: "featured", label: "推荐位", type: "boolean" }
    ]
  },
  news: {
    type: "news",
    title: "资讯管理",
    description: "维护 AI 资讯：标题、来源、正文与发布状态。",
    titleField: "title",
    detailPath: "/news/",
    fields: [
      { key: "title", label: "标题", type: "text", required: true },
      { key: "slug", label: "Slug", type: "text", placeholder: "留空自动生成" },
      { key: "sourceUrl", label: "来源链接", type: "text", placeholder: "https://…" },
      { key: "summary", label: "摘要", type: "textarea", full: true },
      { key: "content", label: "正文", type: "textarea", full: true, required: true },
      TAGS_FIELD
    ]
  },
  mcps: {
    type: "mcps",
    title: "MCP 服务",
    description: "维护 MCP Server 收录：接入方式、分类与标签。",
    titleField: "name",
    detailPath: "/mcps/",
    fields: [
      { key: "name", label: "名称", type: "text", required: true },
      { key: "slug", label: "Slug", type: "text", placeholder: "留空自动生成" },
      { key: "url", label: "仓库/接入地址", type: "text", placeholder: "https://…" },
      CATEGORY_FIELD,
      { key: "description", label: "简介", type: "textarea", full: true },
      TAGS_FIELD,
      { key: "featured", label: "推荐位", type: "boolean" }
    ]
  },
  repos: {
    type: "repos",
    title: "开源项目",
    description: "维护开源项目收录：仓库地址、语言、星数与标签。",
    titleField: "name",
    detailPath: "/repos/",
    fields: [
      { key: "name", label: "名称", type: "text", required: true },
      { key: "slug", label: "Slug", type: "text", placeholder: "留空自动生成" },
      { key: "url", label: "仓库地址", type: "text", placeholder: "https://github.com/…" },
      { key: "language", label: "主要语言", type: "text" },
      { key: "stars", label: "Star 数", type: "number" },
      CATEGORY_FIELD,
      { key: "description", label: "简介", type: "textarea", full: true },
      TAGS_FIELD,
      { key: "featured", label: "推荐位", type: "boolean" }
    ]
  },
  resources: {
    type: "resources",
    title: "学习资源",
    description: "维护学习资源收录：链接、分类与标签。",
    titleField: "title",
    detailPath: "/resources/",
    fields: [
      { key: "title", label: "标题", type: "text", required: true },
      { key: "slug", label: "Slug", type: "text", placeholder: "留空自动生成" },
      { key: "url", label: "资源链接", type: "text", required: true, placeholder: "https://…" },
      CATEGORY_FIELD,
      { key: "description", label: "简介", type: "textarea", full: true },
      TAGS_FIELD,
      { key: "featured", label: "推荐位", type: "boolean" }
    ]
  }
};
