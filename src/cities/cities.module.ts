import { Module } from '@nestjs/common';
import { CitiesService } from './cities.service';
import { CitiesController } from './cities.controller';
import { HttpModule } from '@nestjs/axios';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [HttpModule], 
  controllers: [CitiesController],
  providers: [CitiesService, PrismaService],
})
export class CitiesModule {}
