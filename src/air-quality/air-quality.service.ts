import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../prisma/prisma.service';
import { lastValueFrom } from 'rxjs';
import { Prisma } from '@prisma/client';
import { AirQualityResult, WaqiApiResponse } from './dto/update-air-quality.dto';

@Injectable()
export class AirQualityService {

private readonly logger = new Logger(AirQualityService.name);
  
  private readonly WAQI_TOKEN = process.env.WAQI_TOKEN; 

  constructor(
    private prisma: PrismaService,
    private httpService: HttpService,
  ) {}

  async syncData() {
    // 1. Ambil list stasiun aktif
    const stations = await this.prisma.monitoredCity.findMany({
      where: { isActive: true },
    });

    if (stations.length === 0) return { message: 'No active stations', syncedCount: 0 };

    let successCount = 0;

    for (const station of stations) {
      // const url = `https://api.waqi.info/feed/${station.keyword}/?token=${this.WAQI_TOKEN}`;
      const url = `https://api.waqi.info/feed/@${station.uid}/?token=${this.WAQI_TOKEN}`;

      try {
        const response = await lastValueFrom(this.httpService.get(url));
        
        if (response.data.status === 'ok') {
          const data = response.data.data;
          const category = this.determineCategory(data.aqi);
          const recordDate = new Date(data.time.iso); 

          // TRANSACTION: Double Upsert
          await this.prisma.$transaction([
            
            // A. Upsert ke AirQuality (Snapshot)
            // HAPUS 'stationName' dari sini karena kolomnya sudah tidak ada di schema
            this.prisma.airQuality.upsert({
              where: { monitoredCityId: station.id }, 
              update: {
                aqi: data.aqi,
                category: category,
                recordedAt: recordDate,
                lastSynced: new Date(),
              },
              create: {
                monitoredCityId: station.id,
                aqi: data.aqi,
                category: category,
                recordedAt: recordDate,
              },
            }),

            // B. Upsert ke History (Log)
            // Tetap gunakan logic unique constraints untuk hindari duplikasi [cite: 18]
            this.prisma.airQualityHistory.upsert({
              where: {
                monitoredCityId_recordedAt: { 
                  monitoredCityId: station.id,
                  recordedAt: recordDate,
                },
              },
              update: {}, 
              create: {
                monitoredCityId: station.id,
                aqi: data.aqi,
                category: category,
                recordedAt: recordDate,
              },
            }),
          ]);

          successCount++;
        } 
      } catch (error) {
        this.logger.error(`Error syncing ${station.stationName}`, error);
      }
    }

    // Log hasil sync
    await this.prisma.auditLog.create({
      data: { 
        action: 'SYNC', 
        status: 'SUCCESS', 
        details: `Synced ${successCount} stations. Last sync logic updated.` 
      }
    });

    return { syncedCount: successCount };
  }

  async findAll(query: any) {
    const { startDate, endDate, search } = query;
    
    // 1. Base Condition: HANYA ambil data dari stasiun yang AKTIF
    const whereClause: Prisma.AirQualityWhereInput = {
      monitoredCity: {
        isActive: true
      }
    };

    // 2. Filter Tanggal (Jika ada)
    if (startDate && endDate) {
      whereClause.recordedAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    // 3. Filter Search (Server-side)
    if (search) {
      // Note: Prisma akan menganggap kondisi di atas (isActive) AND kondisi di bawah (OR)
      whereClause.OR = [
        {
          monitoredCity: {
            stationName: { contains: search, mode: 'insensitive' },
          },
        },
        {
          monitoredCity: {
            keyword: { contains: search, mode: 'insensitive' },
          },
        },
        {
          category: { contains: search, mode: 'insensitive' },
        },
      ];
    }

    return this.prisma.airQuality.findMany({
      include: {
        monitoredCity: true,
      },
      where: whereClause,
      orderBy: { recordedAt: 'desc' },
    });
  }

  // Ambil data log terakhir buat ditampilkan di tombol Sync
  async getLastSync() {
    return this.prisma.auditLog.findFirst({
      where: { action: 'SYNC', status: 'SUCCESS' }, // Filter cuma yang Sync
      orderBy: { performedAt: 'desc' },             // Ambil yang paling baru
    });
  }

  // --- HELPER: Kategori Polusi ---
  private determineCategory(aqi: number): string {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
    if (aqi <= 200) return 'Unhealthy';
    if (aqi <= 300) return 'Very Unhealthy';
    return 'Hazardous';
  }

  async findHistory(query: { startDate?: string; endDate?: string; cityId?: string }) {
    const { startDate, endDate, cityId } = query;
    
    const whereClause: Prisma.AirQualityHistoryWhereInput = {
      // Base: Defaultnya ambil yang active, TAPI jika user minta spesifik ID (history view), 
      // kita bisa abaikan status active/inactive atau tetap enforce. 
      // Di sini kita tetap enforce active stasiun.
      monitoredCity: {
        isActive: true 
      }
    };

    // --- LOGIC BARU: Filter by Specific City ID ---
    if (cityId) {
      whereClause.monitoredCityId = Number(cityId); // Pastikan convert ke Number
    }

    // Logic Date Filter (Tetap sama)
    if (startDate && endDate) {
      whereClause.recordedAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else {
      // Default 30 hari (Tetap sama)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      whereClause.recordedAt = {
        gte: thirtyDaysAgo,
      };
    }

    return this.prisma.airQualityHistory.findMany({
      where: whereClause,
      include: {
        monitoredCity: true,
      },
      // Sort Descending (Terbaru paling atas) lebih enak dibaca untuk list history
      orderBy: {
        recordedAt: 'desc', 
      },
    });
  }
}
