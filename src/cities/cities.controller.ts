import { Controller, Get, Post, Body, Patch, Param } from '@nestjs/common';
import { CitiesService } from './cities.service';
import { CreateCityDto } from './dto/create-city.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Cities')
@Controller('cities')
export class CitiesController {
  constructor(private readonly citiesService: CitiesService) {}

  @Post()
  @ApiOperation({ summary: 'Tambah kota baru untuk dimonitor' }) // Judul endpoint
  @ApiResponse({ status: 201, description: 'Kota berhasil ditambahkan.' })
  @ApiResponse({ status: 400, description: 'Keyword kota tidak valid di API WAQI.' })
  create(@Body() createCityDto: CreateCityDto) {
    return this.citiesService.create(createCityDto);
  }

  @Get()
  findAll() {
    return this.citiesService.findAll();
  }

  @Patch(':id/toggle')
  toggle(@Param('id') id: string) {
    return this.citiesService.toggleActive(+id);
  }
}