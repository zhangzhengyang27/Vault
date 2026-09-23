import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { McpsService } from "./mcps.service";
import { McpRegistrySyncService } from "./mcp-registry-sync.service";
import { McpToolsService } from "./mcp-tools.service";
import { CreateMcpDto } from "./dto/create-mcp.dto";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { RolesGuard } from "../../auth/roles.guard";
import { Roles } from "../../auth/roles.decorator";

@Controller("mcps")
export class McpsController {
  constructor(
    private readonly mcpsService: McpsService,
    private readonly registrySync: McpRegistrySyncService,
    private readonly mcpTools: McpToolsService,
  ) {}

  @Get()
  findAll(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("q") q?: string,
    @Query("sort") sort?: string,
    @Query("type") type?: string,
  ) {
    return this.mcpsService.findAll({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 12,
      q,
      sort,
      type,
    });
  }

  // 注意：此路由必须在 :slug 之前，否则会被当作 slug 处理
  @Post("registry/sync")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  syncRegistry() {
    return this.registrySync.syncFromRegistry();
  }

  // MCP 工具列表探测（必须在 :slug 之前）
  // 探测会在服务器上 spawn npx/uvx/docker 进程或向远端发起请求，
  // 属于高开销诊断操作，仅限管理员触发，避免被匿名访客当探测/DoS 跳板
  @Get(":slug/tools")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  async getTools(@Param("slug") slug: string) {
    const mcp = await this.mcpsService.findOne(slug);
    if (!mcp) return { tools: [], source: "unavailable", note: "MCP 不存在" };
    return this.mcpTools.getTools(mcp);
  }

  @Get(":slug")
  findOne(@Param("slug") slug: string, @Query("type") type?: string) {
    // type 过滤让 /mcp/[slug] 前端能拒绝把 skill 当 MCP 渲染；/skills 复用本接口时不传 type
    return this.mcpsService.findOne(slug, type);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  create(@Body() body: CreateMcpDto) {
    return this.mcpsService.create(body);
  }

  @Patch(":slug")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  update(@Param("slug") slug: string, @Body() body: Partial<CreateMcpDto>) {
    return this.mcpsService.update(slug, body);
  }

  @Delete(":slug")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  remove(@Param("slug") slug: string) {
    return this.mcpsService.remove(slug);
  }
}
