import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from 'src/prisma/prisma.service';
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

async getRealtimeAirQuality() {
    this.logger.log('Starting Data Fetching (Read-Only Mode)...');

    // 1. Ambil list kota dari DB
    const cities = await this.prisma.monitoredCity.findMany({
      where: { isActive: true },
    });

    if (cities.length === 0) {
      return { message: 'No active cities found', data: [] };
    }

    // Gunakan Interface di array agar tidak error 'never'
    const collectedData: AirQualityResult[] = [];

    for (const city of cities) {
      const url = `https://api.waqi.info/feed/${city.keyword}/?token=${this.WAQI_TOKEN}`;

      try {
        // Kita cast response-nya ke interface WaqiApiResponse agar aman
        const response = await lastValueFrom(this.httpService.get<WaqiApiResponse>(url));
        const responseBody = response.data; // Akses body response

        if (responseBody.status === 'ok') {
            const data = responseBody.data;
            
            // LOGIC KATEGORI (Asumsi method ini ada)
            const category = this.determineCategory(data.aqi);

            // PARSING TANGGAL
            // JSON kamu pakai "s": "2016-12-10 19:00:00"
            // Kita gabungkan dengan Timezone jika perlu, atau langsung parse string-nya.
            // new Date("2016-12-10 19:00:00") valid di JS.
            let recordDate = new Date(data.time.s); 
            
            // Fallback: Jika valid date gagal, pakai timestamp 'v' * 1000
            if (isNaN(recordDate.getTime())) {
                recordDate = new Date(data.time.v * 1000);
            }

            collectedData.push({
                monitoredCityId: city.id,
                cityName: city.name,
                keyword: city.keyword,
                stationName: data.city.name, // "Chi_sp, Illinois"
                aqi: data.aqi,                // 71
                category: category,
                recordedAt: recordDate,
                fetchedAt: new Date(),
                raw: data // Opsional: simpan raw data API
            });

        } else {
            this.logger.warn(`API returned status ${responseBody.status} for ${city.name}`);
            collectedData.push({
                monitoredCityId: city.id,
                cityName: city.name,
                keyword: city.keyword,
                stationName: 'N/A',
                aqi: 0,
                category: 'UNKNOWN',
                recordedAt: new Date(),
                fetchedAt: new Date(),
                status: 'API_ERROR',
                error: `Status: ${responseBody.status}`
            });
        }

      } catch (cityError) {
        this.logger.error(`Error processing city ${city.name}`, cityError);
        collectedData.push({
            monitoredCityId: city.id,
            cityName: city.name,
            keyword: city.keyword,
            stationName: 'ERROR',
            aqi: -1,
            category: 'ERROR',
            recordedAt: new Date(),
            fetchedAt: new Date(),
            status: 'EXCEPTION',
            error: cityError.message
        });
      }
    }

    // Return hasil
    return {
      count: collectedData.length,
      data: collectedData
    };
  }


async syncData() {
    this.logger.log('Starting Sync Process...');
    
    // 1. Ambil daftar kota yang STATUS-nya ACTIVE dari Database
    const cities = await this.prisma.monitoredCity.findMany({
      where: { isActive: true },
    });

    if (cities.length === 0) {
      this.logger.warn('No active cities found to monitor.');
      return { message: 'No cities to sync', syncedCount: 0 };
    }

    let successCount = 0;

    try {
      // Loop berdasarkan data database
      for (const city of cities) {
        
        // Gunakan 'city.keyword' untuk URL API
        const url = `https://api.waqi.info/feed/${city.keyword}/?token=${this.WAQI_TOKEN}`;        
        
        try {
          const response = await lastValueFrom(this.httpService.get(url));
          const data = response.data.data;

          if (response.data.status === 'ok') {
            const category = this.determineCategory(data.aqi);
            
            // Konversi string ISO ke Date Object
            // Pastikan formatnya valid. API WAQI kadang return "time": { "s": ... }
            const recordDate = new Date(data.time.iso); 

            // Upsert ke Database
            await this.prisma.airQuality.upsert({
              where: {
                stationName_recordedAt: {
                  stationName: data.city.name, // Nama stasiun dari API
                  recordedAt: recordDate,
                },
              },
              update: {
                aqi: data.aqi,
                category: category,
                lastSynced: new Date(),
                // Update relasi juga (optional, jaga-jaga)
                monitoredCityId: city.id, 
              },
              create: {
                stationName: data.city.name,
                aqi: data.aqi,
                category: category,
                recordedAt: recordDate,
                lastSynced: new Date(),
                
                // PENTING: Sambungkan ke ID Kota di Database kita
                monitoredCity: {
                  connect: { id: city.id }
                }
              },
            });
            successCount++;
          } else {
             this.logger.warn(`Failed to fetch data for ${city.name}: ${response.data.data}`);
          }
        } catch (cityError) {
          // Kalau 1 kota error, jangan stop loop kota lain
          this.logger.error(`Error processing city ${city.name}`, cityError);
        }
      }

      // Log Sukses Global
      await this.prisma.auditLog.create({
        data: { action: 'SYNC', status: 'SUCCESS', details: `Berhasil sync ${successCount} data` }
      });

      return { message: 'Sync completed', syncedCount: successCount };

    } catch (error) {
      this.logger.error('Sync Fatal Error', error);
      await this.prisma.auditLog.create({
        data: { action: 'SYNC', status: 'FAILED', details: `Sync Error: ${error.message}` }
      });
      throw error;
    }
  }

  // --- LOGIC 2: READ DATA (Untuk Tabel & Dashboard) ---
  async findAll(query: any) {
    const { startDate, endDate, search } = query;
    const whereClause: Prisma.AirQualityWhereInput = {};

    // Filter Tanggal (Wajib buat Dashboard)
    if (startDate && endDate) {
      whereClause.recordedAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    // Pencarian (Search by Station Name)
    if (search) {
      whereClause.stationName = { contains: search, mode: 'insensitive' };
    }

    return this.prisma.airQuality.findMany({
      where: whereClause,
      orderBy: { recordedAt: 'desc' }, // Default sort: data terbaru [cite: 22]
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

}
