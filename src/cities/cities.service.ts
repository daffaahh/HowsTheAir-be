import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { CreateCityDto } from './dto/create-city.dto';

@Injectable()
export class CitiesService {
  constructor(
    private prisma: PrismaService,
    private httpService: HttpService // Jangan lupa import HttpModule di CitiesModule
  ) {}

  // 1. Create New City
  async create(createCityDto: CreateCityDto) {
    const { stationName, keyword } = createCityDto;

    // Validasi ke API WAQI dulu sebelum simpan
    const url = `https://api.waqi.info/feed/${keyword}/?token=${process.env.WAQI_TOKEN}`;
    try {
      const response = await lastValueFrom(this.httpService.get(url));
      if (response.data.status !== 'ok') {
        throw new BadRequestException(`Keyword '${keyword}' tidak ditemukan di WAQI API.`);
      }
    } catch (e) {
       throw new BadRequestException('Gagal memvalidasi keyword kota.');
    }

    return this.prisma.monitoredCity.create({
      data: { stationName, keyword, isActive: true },
    });
  }

  // 2. Get All Cities
  findAll() {
    return this.prisma.monitoredCity.findMany();
  }

  // 3. Toggle Active/Inactive (Soft Delete style)
  async toggleActive(id: number) {
    const city = await this.prisma.monitoredCity.findUnique({ where: { id } });
    if (!city) throw new BadRequestException('City not found');

    return this.prisma.monitoredCity.update({
      where: { id },
      data: { isActive: !city.isActive }, // Flip status
    });
  }
}