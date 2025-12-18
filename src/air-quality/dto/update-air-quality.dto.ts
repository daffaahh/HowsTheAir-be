import { PartialType } from '@nestjs/mapped-types';
import { CreateAirQualityDto } from './create-air-quality.dto';

export class UpdateAirQualityDto extends PartialType(CreateAirQualityDto) {}

// Interface untuk hasil olahan yang akan kita return
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

// Interface untuk Response dari API WAQI (Sesuai JSON kamu)
export interface WaqiApiResponse {
  status: string;
  data: {
    idx: number;
    aqi: number;
    time: {
      v: number;
      s: string; // "2016-12-10 19:00:00"
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
