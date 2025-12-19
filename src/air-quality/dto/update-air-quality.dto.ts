import { PartialType } from '@nestjs/mapped-types';
import { CreateAirQualityDto } from './create-air-quality.dto';

export class UpdateAirQualityDto extends PartialType(CreateAirQualityDto) {}

export interface AirQualityResult {
  monitoredCityId: number;
  cityName: string;
  keyword: string;
  stationName: string;
  aqi: number;
  category: string;
  recordedAt: Date;
  fetchedAt: Date;
  raw?: any;
  status?: string;
  error?: string;
}

export interface WaqiApiResponse {
  status: string;
  data: {
    idx: number;
    aqi: number;
    time: {
      v: number;
      s: string;
      tz: string;
    };
    city: {
      name: string;
      url: string;
      geo: string[];
    };
    iaqi?: any;
    forecast?: any;
  };
}
