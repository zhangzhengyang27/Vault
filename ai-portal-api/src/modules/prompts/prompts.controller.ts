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
} from '@nestjs/common';
import { PromptsService } from './prompts.service';
import { CreatePromptDto } from './dto/create-prompt.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';

@Controller('prompts')
export class PromptsController {
  constructor(private readonly promptsService: PromptsService) {}

  @Get()
  findAll(
    @Query('kind') kind?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('category') category?: string,
    @Query('q') q?: string,
    @Query('sort') sort?: string,
    @Query('media') media?: 'image' | 'text',
  ) {
    return this.promptsService.findAll({
      kind,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 12,
      category,
      q,
      sort,
      media,
    });
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.promptsService.findOne(slug);
  }

  @Post(':slug/use')
  use(@Param('slug') slug: string) {
    return this.promptsService.use(slug);
  }

  @Patch(':slug')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  update(@Param('slug') slug: string, @Body() body: Partial<CreatePromptDto>) {
    return this.promptsService.update(slug, body);
  }

  @Delete(':slug')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  remove(@Param('slug') slug: string) {
    return this.promptsService.remove(slug);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  create(@Body() body: CreatePromptDto) {
    return this.promptsService.create(body);
  }
}
