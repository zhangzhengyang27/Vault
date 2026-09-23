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
import { ResourcesService } from './resources.service';
import { CreateResourceDto } from './dto/create-resource.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';

@Controller('resources')
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: string,
    @Query('q') q?: string,
    @Query('sort') sort?: string,
  ) {
    return this.resourcesService.findAll({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 12,
      type,
      q,
      sort,
    });
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.resourcesService.findOne(slug);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  create(@Body() body: CreateResourceDto) {
    return this.resourcesService.create(body);
  }

  @Patch(':slug')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  update(
    @Param('slug') slug: string,
    @Body() body: Partial<CreateResourceDto>,
  ) {
    return this.resourcesService.update(slug, body);
  }

  @Delete(':slug')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  remove(@Param('slug') slug: string) {
    return this.resourcesService.remove(slug);
  }
}
