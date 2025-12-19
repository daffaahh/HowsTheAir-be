// src/air-quality/air-quality.controller.ts
import { Controller, Get, Post, Query } from '@nestjs/common';
import { AirQualityService } from './air-quality.service';

@Controller('air-quality')
export class AirQualityController {
  constructor(private readonly airQualityService: AirQualityService) {}

  // Trigger Sync Manual (Tombol di FE)
  @Post('sync')
  syncData() {
    return this.airQualityService.syncData();
  }

  // Ambil Data Tabel (Bisa difilter)
  @Get()
  findAll(@Query() query: any) {
    return this.airQualityService.findAll(query);
  }

  @Get('history')
  getHistory(@Query() query: { startDate?: string; endDate?: string; cityId?: string }) {
    return this.airQualityService.findHistory(query);
  }

  // Ambil Info Last Sync
  @Get('last-sync')
  getLastSync() {
    return this.airQualityService.getLastSync();
  }
}