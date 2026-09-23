import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Resource } from "../../entities/resource.entity";
import { ResourcesController } from "./resources.controller";
import { ResourcesService } from "./resources.service";
import { AuthModule } from "../../auth/auth.module";

@Module({
  imports: [TypeOrmModule.forFeature([Resource]), AuthModule],
  controllers: [ResourcesController],
  providers: [ResourcesService],
})
export class ResourcesModule {}
