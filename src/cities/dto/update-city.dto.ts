import { PartialType } from '@nestjs/swagger';
import { CreateCityDto } from './create-city.dto';
import { IsString, IsOptional } from 'class-validator';

export class UpdateCityDto extends PartialType(CreateCityDto) {
  @IsOptional()
  @IsString()
  keyword?: string; 
  // Kita batasi hanya keyword yang lazim diedit. 
  // UID dan StationName sebaiknya jangan diubah manual karena terkait teknis API.
}
