import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AirQualityModule } from './air-quality/air-quality.module';
import { CitiesModule } from './cities/cities.module';

@Module({
  imports: [AirQualityModule, CitiesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
