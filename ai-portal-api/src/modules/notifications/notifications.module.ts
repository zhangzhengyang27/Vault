import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Notification } from "../../entities/notification.entity";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";
import { AuthModule } from "../../auth/auth.module";
import { NotificationsService } from "./notifications.service";
import { NotificationsController } from "./notifications.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification]),
    SubscriptionsModule,
    AuthModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
