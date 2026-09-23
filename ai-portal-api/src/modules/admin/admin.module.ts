import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Tool } from "../../entities/tool.entity";
import { Prompt } from "../../entities/prompt.entity";
import { Article } from "../../entities/article.entity";
import { News } from "../../entities/news.entity";
import { User } from "../../entities/user.entity";
import { Post } from "../../entities/post.entity";
import { Category } from "../../entities/category.entity";
import { Submission } from "../../entities/submission.entity";
import { Mcp } from "../../entities/mcp.entity";
import { Repo } from "../../entities/repo.entity";
import { Resource } from "../../entities/resource.entity";
import { LoginLog } from "../../entities/login-log.entity";
import { OperLog } from "../../entities/oper-log.entity";
import { AdminController } from "./admin.controller";
import { AdminSubmissionsController } from "./admin-submissions.controller";
import { AdminContentController } from "./admin-content.controller";
import { AdminUsersController } from "./admin-users.controller";
import { AdminLogsController } from "./admin-logs.controller";
import { AdminService } from "./admin.service";
import { AdminContentService } from "./admin-content.service";
import { AdminUsersService } from "./admin-users.service";
import { AdminBootstrapService } from "./admin-bootstrap.service";
import { AuthModule } from "../../auth/auth.module";
import { SubmissionsModule } from "../submissions/submissions.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { PostsModule } from "../posts/posts.module";
import { CommentsModule } from "../comments/comments.module";
import { AdminCommunityController } from "./admin-community.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Tool,
      Prompt,
      Article,
      News,
      User,
      Post,
      Category,
      Submission,
      LoginLog,
      OperLog,
      Mcp,
      Repo,
      Resource,
    ]),
    AuthModule,
    SubmissionsModule,
    NotificationsModule,
    PostsModule,
    CommentsModule,
  ],
  controllers: [
    AdminController,
    AdminSubmissionsController,
    AdminContentController,
    AdminUsersController,
    AdminLogsController,
    AdminCommunityController,
  ],
  providers: [
    AdminService,
    AdminContentService,
    AdminUsersService,
    AdminBootstrapService,
  ],
})
export class AdminModule {}
