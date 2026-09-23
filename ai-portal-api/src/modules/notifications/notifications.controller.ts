import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { CurrentUser } from "../../auth/current-user.decorator";

/** 允许过滤的通知类型白名单（防任意字符串直达 SQL In 查询）。
 *  audit 为历史遗留（数据库已无该类型数据，已核实），不再接受。 */
const NOTIFICATION_TYPES = [
  "system",
  "comment",
  "like",
  "subscription",
  "follow",
  "submission",
] as const;

/** 逗号串 → 去空白 → 白名单过滤（导出供表驱动测试） */
export function parseTypes(types?: string): string[] {
  return (types ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is (typeof NOTIFICATION_TYPES)[number] =>
      (NOTIFICATION_TYPES as readonly string[]).includes(s),
    );
}

@Controller("notifications")
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(
    @CurrentUser() user: { id: number },
    @Query("unread") unread?: string,
    @Query("types") types?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    return this.notificationsService.listByUser(user.id, {
      unreadOnly: unread === "true",
      types: parseTypes(types),
      limit: limit ? Number(limit) : 20,
      offset: offset ? Number(offset) : 0,
    });
  }

  @Get("unread-count")
  unreadCount(
    @CurrentUser() user: { id: number },
    @Query("types") types?: string,
  ) {
    return this.notificationsService.unreadCount(user.id, parseTypes(types));
  }

  @Patch(":id/read")
  markRead(@CurrentUser() user: { id: number }, @Param("id") id: string) {
    return this.notificationsService.markRead(user.id, Number(id));
  }

  @Patch("read-all")
  markAllRead(@CurrentUser() user: { id: number }) {
    return this.notificationsService.markAllRead(user.id);
  }
}
