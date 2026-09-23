import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { IsIn, IsString, MaxLength, MinLength } from "class-validator";
import { SubscriptionsService } from "./subscriptions.service";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { CurrentUser } from "../../auth/current-user.decorator";
import type { SubscriptionTargetType } from "../../entities/subscription.entity";

class SubscribeDto {
  @IsIn(["category", "tag", "keyword"])
  targetType: SubscriptionTargetType;
  // 空字符串关键词会匹配所有新内容刷屏通知，必须非空且有长度上限
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  targetValue: string;
}

@Controller("subscriptions")
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get()
  list(@CurrentUser() user: { id: number }) {
    return this.subscriptionsService.listByUser(user.id);
  }

  @Post()
  subscribe(@CurrentUser() user: { id: number }, @Body() body: SubscribeDto) {
    return this.subscriptionsService.subscribe(
      user.id,
      body.targetType,
      body.targetValue,
    );
  }

  @Get("check")
  check(
    @CurrentUser() user: { id: number },
    @Query("targetType") targetType: string,
    @Query("targetValue") targetValue: string,
  ) {
    return this.subscriptionsService.check(
      user.id,
      targetType as SubscriptionTargetType,
      targetValue,
    );
  }

  @Delete(":id")
  unsubscribe(@CurrentUser() user: { id: number }, @Param("id") id: string) {
    return this.subscriptionsService.unsubscribe(user.id, Number(id));
  }
}
