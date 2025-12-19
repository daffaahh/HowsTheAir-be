import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AirQualityService } from './air-quality.service';
import { AirQualityController } from './air-quality.controller';
import { PrismaService } from '../prisma/prisma.service'; 

@Module({
  imports: [HttpModule], 
  controllers: [AirQualityController],
  providers: [AirQualityService, PrismaService],
})
export class AirQualityModule {}