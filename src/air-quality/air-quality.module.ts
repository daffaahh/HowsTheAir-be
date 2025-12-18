// src/air-quality/air-quality.module.ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios'; // Import ini
import { AirQualityService } from './air-quality.service';
import { AirQualityController } from './air-quality.controller';
import { PrismaService } from '../prisma/prisma.service'; // Import ini

@Module({
  imports: [HttpModule], // Masukkan HttpModule di sini
  controllers: [AirQualityController],
  providers: [AirQualityService, PrismaService], // Masukkan PrismaService di sini
})
export class AirQualityModule {}