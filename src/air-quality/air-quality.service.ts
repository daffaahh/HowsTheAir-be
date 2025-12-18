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
  const cities = await this.prisma.monitoredCity.findMany({ where: { isActive: true } });
  let successCount = 0;

  for (const city of cities) {
    const url = `https://api.waqi.info/feed/${city.keyword}/?token=${this.WAQI_TOKEN}`;
    
    try {
      const response = await lastValueFrom(this.httpService.get(url));
      const data = response.data.data;

      if (response.data.status === 'ok') {
        const category = this.determineCategory(data.aqi);
        const recordDate = new Date(data.time.iso);

        // Gunakan Transaction untuk update dua tabel sekaligus
        await this.prisma.$transaction([
          // 1. Update Current Data (Tabel Utama)
          // Selalu update ke data terbaru dari API
          this.prisma.airQuality.upsert({
            where: { monitoredCityId: city.id },
            update: {
              stationName: data.attributions[0].name,
              aqi: data.aqi,
              category: category,
              recordedAt: recordDate,
              lastSynced: new Date(),
            },
            create: {
              monitoredCityId: city.id,
              stationName: data.attributions[0].name,
              aqi: data.aqi,
              category: category,
              recordedAt: recordDate,
            },
          }),

          // 2. Insert ke History
          // Upsert di sini gunanya: jika data dengan jam yang sama sudah ada, jangan insert lagi (hindari duplikasi) 
          this.prisma.airQualityHistory.upsert({
            where: {
              monitoredCityId_recordedAt: {
                monitoredCityId: city.id,
                recordedAt: recordDate,
              },
            },
            update: {}, // Jika sudah ada, tidak perlu update apa-apa
            create: {
              monitoredCityId: city.id,
              aqi: data.aqi,
              category: category,
              recordedAt: recordDate,
            },
          }),
        ]);

        successCount++;
      }
    } catch (cityError) {
      this.logger.error(`Error sync ${city.name}: ${cityError.message}`);
    }
  }

  // Catat Audit Log untuk fitur 'last sync time' [cite: 19]
  await this.prisma.auditLog.create({
    data: { action: 'SYNC', status: 'SUCCESS', details: `Synced ${successCount} cities` }
  });

  return { message: 'Sync success', count: successCount };
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
