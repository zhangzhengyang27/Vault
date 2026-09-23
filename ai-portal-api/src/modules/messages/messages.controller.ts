import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { MessagesService } from "./messages.service";
import { SendMessageDto } from "./dto/send-message.dto";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { CurrentUser } from "../../auth/current-user.decorator";

/** 私信（全 JWT；未登录不可收发） */
@Controller("messages")
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  send(
    @CurrentUser() user: { id: number; username: string },
    @Body() body: SendMessageDto,
  ) {
    return this.messagesService.send(user, body.to, body.content);
  }

  /** 会话列表（联系人 + 最后一条 + 未读数） */
  @Get("conversations")
  conversations(@CurrentUser() user: { id: number }) {
    return this.messagesService.conversations(user.id);
  }

  /** 与某人的对话；拉取即已读 */
  @Get("chat")
  chat(
    @CurrentUser() user: { id: number },
    @Query("username") username: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    return this.messagesService.chat(
      user.id,
      username,
      limit ? Number(limit) : 50,
      offset ? Number(offset) : 0,
    );
  }

  /** 私信未读总数（铃铛/消息 tab 徽章） */
  @Get("unread")
  unread(@CurrentUser() user: { id: number }) {
    return this.messagesService.unreadTotal(user.id);
  }
}
