import AdminContentManager, {
  type AdminContentTypeConfig,
} from "@/components/admin/AdminContentManager";

const CONFIG: AdminContentTypeConfig = {
  type: "tools",
  title: "工具管理",
  description: "管理 AI 工具：新建、编辑、上下架与删除。",
  titleField: "name",
  fields: [
    { key: "name", label: "名称", type: "text", required: true, placeholder: "工具名称" },
    { key: "slug", label: "Slug", type: "text", placeholder: "留空自动生成" },
    { key: "website", label: "官网地址", type: "text", placeholder: "https://..." },
    { key: "tags", label: "标签", type: "tags" },
    { key: "categoryId", label: "分类", type: "select" },
    { key: "isFree", label: "是否免费", type: "boolean" },
    { key: "requiresLogin", label: "是否需要登录", type: "boolean" },
    { key: "rating", label: "评分", type: "number" },
    { key: "description", label: "简介", type: "textarea", full: true, required: true },
    { key: "content", label: "详细介绍", type: "textarea", full: true },
    {
      key: "status",
      label: "状态",
      type: "select",
      options: [
        { value: "published", label: "已发布" },
        { value: "draft", label: "草稿" },
        { value: "pending", label: "待审核" },
        { value: "archived", label: "已归档" },
      ],
    },
  ],
  detailPath: "/tools/",
};

export default function AdminToolsPage() {
  return <AdminContentManager config={CONFIG} />;
}
