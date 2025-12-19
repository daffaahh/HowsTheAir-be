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
    private httpService: HttpService 
  ) {}

async create(createCityDto: CreateCityDto) {
  const exists = await this.prisma.monitoredCity.findUnique({
    where: { uid: createCityDto.uid }
  });
  
  if (exists) throw new BadRequestException('Stasiun ini sudah dimonitor.');

  return this.prisma.$transaction([
    this.prisma.monitoredCity.create({
      data: {
        stationName: createCityDto.stationName,
        keyword: createCityDto.keyword,
        uid: createCityDto.uid,
        isActive: true,
      },
    }),
    this.prisma.auditLog.create({
      data: { 
        action: 'CREATE', 
        status: 'SUCCESS', 
        details: `New station Added. Ready to monitor.` 
      }
    })
  ]) 

}

  async searchStations(query: string) {
    if (!query) return [];
    
    const url = `https://api.waqi.info/search/?token=${process.env.WAQI_TOKEN}&keyword=${query}`;
    
    try {
      const response = await lastValueFrom(this.httpService.get(url));
      
      if (response.data.status === 'ok') {
        return response.data.data.map((item) => ({
          uid: item.uid,
          name: item.station.name,
          aqi: item.aqi,
          geo: item.station.geo,
          keywordValue: `@${item.uid}` 
        }));
      }
      return [];
    } catch (error) {
      throw new BadRequestException('Gagal mencari stasiun.');
    }
  }

  findAll() {
    return this.prisma.monitoredCity.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async toggleActive(id: number) {
    const city = await this.prisma.monitoredCity.findUnique({ where: { id } });
    if (!city) throw new BadRequestException('City not found');

    return this.prisma.$transaction([
      this.prisma.monitoredCity.update({
        where: { id },
        data: { isActive: !city.isActive },
      }),
      this.prisma.auditLog.create({
        data: { 
          action: 'UPDATE', 
          status: 'SUCCESS', 
          details: `Status switched Successfully.` 
        }
      })
    ]) 

  }

async update(id: number, updateCityDto: UpdateCityDto) {
    const city = await this.prisma.monitoredCity.findUnique({ where: { id } });
    if (!city) throw new BadRequestException('City not found');

    return this.prisma.$transaction([
      this.prisma.monitoredCity.update({
        where: { id },
        data: {
          keyword: updateCityDto.keyword, // Update keyword
        },
      }),
      this.prisma.auditLog.create({
        data: { 
          action: 'UPDATE', 
          status: 'SUCCESS', 
          details: `Keyword/Tag updated Successfully.` 
        }
      })
    ])
    

  }
  
  async remove(id: number) {
    const city = await this.prisma.monitoredCity.findUnique({ where: { id } });
    if (!city) throw new BadRequestException('Stasiun tidak ditemukan');

    return this.prisma.$transaction([
      this.prisma.airQualityHistory.deleteMany({
        where: { monitoredCityId: id },
      }),
      
      this.prisma.airQuality.deleteMany({
        where: { monitoredCityId: id },
      }),

      this.prisma.monitoredCity.delete({
        where: { id },
      }),

      this.prisma.auditLog.create({
      data: { 
        action: 'DELETE', 
        status: 'SUCCESS', 
        details: `Station deleted Successfully.` 
      }
      })
    ]);
  }
}