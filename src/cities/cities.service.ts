import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { CreateCityDto } from './dto/create-city.dto';
import { UpdateCityDto } from './dto/update-city.dto';

@Injectable()
export class CitiesService {
  constructor(
    private prisma: PrismaService,
    private httpService: HttpService // Jangan lupa import HttpModule di CitiesModule
  ) {}

async create(createCityDto: CreateCityDto) {
  // Cek duplikasi berdasarkan UID (bukan keyword lagi)
  const exists = await this.prisma.monitoredCity.findUnique({
    where: { uid: createCityDto.uid }
  });
  
  if (exists) throw new BadRequestException('Stasiun ini sudah dimonitor.');

  return this.prisma.monitoredCity.create({
    data: {
      stationName: createCityDto.stationName,
      keyword: createCityDto.keyword,
      uid: createCityDto.uid,
      isActive: true,
    },
  });
}

  async searchStations(query: string) {
    if (!query) return [];
    
    // Endpoint search WAQI
    const url = `https://api.waqi.info/search/?token=${process.env.WAQI_TOKEN}&keyword=${query}`;
    
    try {
      const response = await lastValueFrom(this.httpService.get(url));
      
      if (response.data.status === 'ok') {
        // Kita mapping biar data yang dikirim ke FE bersih
        return response.data.data.map((item) => ({
          uid: item.uid,
          name: item.station.name, // "bangalore; Jayanagar..."
          aqi: item.aqi,
          geo: item.station.geo,
          // Kita format keywordnya pakai UID biar robust: "@12345"
          keywordValue: `@${item.uid}` 
        }));
      }
      return [];
    } catch (error) {
      throw new BadRequestException('Gagal mencari stasiun.');
    }
  }

  // 2. Get All Cities
  findAll() {
    return this.prisma.monitoredCity.findMany({
      orderBy: {
        createdAt: 'desc', // Tampilkan data yang baru ditambah paling atas
      },
    });
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

async update(id: number, updateCityDto: UpdateCityDto) {
    // Validasi simple: Pastikan data ada
    const city = await this.prisma.monitoredCity.findUnique({ where: { id } });
    if (!city) throw new BadRequestException('City not found');

    return this.prisma.monitoredCity.update({
      where: { id },
      data: {
        keyword: updateCityDto.keyword, // Update keyword
        // Bisa tambah field lain jika perlu (misal stationName)
      },
    });
  }
  
  async remove(id: number) {
    // Cek dulu apakah data ada
    const city = await this.prisma.monitoredCity.findUnique({ where: { id } });
    if (!city) throw new BadRequestException('Stasiun tidak ditemukan');

    // Gunakan Transaction agar atomik (semua terhapus atau tidak sama sekali)
    return this.prisma.$transaction([
      // 1. Hapus History Log
      this.prisma.airQualityHistory.deleteMany({
        where: { monitoredCityId: id },
      }),
      
      // 2. Hapus Snapshot Terbaru
      this.prisma.airQuality.deleteMany({
        where: { monitoredCityId: id },
      }),

      // 3. Hapus Master Kotanya
      this.prisma.monitoredCity.delete({
        where: { id },
      }),
    ]);
  }
}