import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Repo } from "../../entities/repo.entity";
import { ReposController } from "./repos.controller";
import { ReposService } from "./repos.service";
import { AuthModule } from "../../auth/auth.module";

@Module({
  imports: [TypeOrmModule.forFeature([Repo]), AuthModule],
  controllers: [ReposController],
  providers: [ReposService],
})
export class ReposModule {}
