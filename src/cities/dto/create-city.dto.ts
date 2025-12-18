import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger'; // <--- Import ini

export class CreateCityDto {
  @ApiProperty({
    example: 'DKI Jakarta', // <--- Ini yang muncul di Swagger
    description: 'Nama kota yang akan ditampilkan di UI Dashboard',
  })
  @IsString()
  @IsNotEmpty()
  stationName: string; 

  @ApiProperty({
    example: 'jakarta', // <--- Ini yang muncul di Swagger
    description: 'Keyword slug yang valid untuk API WAQI (waqi.info)',
  })
  @IsString()
  @IsNotEmpty()
  keyword: string; 
}