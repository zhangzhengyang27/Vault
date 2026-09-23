import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { FavoritesService } from "./favorites.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { CreateFavoriteDto } from "./dto/create-favorite.dto";

@Controller("favorites")
@UseGuards(JwtAuthGuard)
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Post()
  create(@CurrentUser() user: { id: number }, @Body() body: CreateFavoriteDto) {
    return this.favoritesService.create(
      user.id,
      body.targetType,
      body.targetId,
      body.title,
      body.targetSlug,
    );
  }

  @Get()
  findAll(@CurrentUser() user: { id: number }) {
    return this.favoritesService.findAll(user.id);
  }

  @Delete(":id")
  remove(@CurrentUser() user: { id: number }, @Param("id") id: string) {
    return this.favoritesService.remove(user.id, Number(id));
  }
}
