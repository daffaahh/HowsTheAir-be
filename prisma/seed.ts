import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper untuk menentukan kategori berdasarkan AQI
function determineCategory(aqi: number): string {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
  if (aqi <= 200) return 'Unhealthy';
  if (aqi <= 300) return 'Very Unhealthy';
  return 'Hazardous';
}

// Helper untuk membuat angka random di sekitar angka tertentu (biar grafik terlihat real/fluktuatif)
function getRandomAQI(base: number, variance: number): number {
  const min = Math.max(0, base - variance);
  const max = base + variance;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  console.log('🌱 Starting Seeding with 30 Days History...');

  // 1. DATA KOTA (Sesuai Screenshot & Schema baru dengan UID)
  const citiesData = [
    { uid: 1453, keyword: 'chongqing', name: 'Chongqing, China', baseAQI: 160 },
    { uid: 11428, keyword: 'bangalore', name: 'Bangalore, India', baseAQI: 110 },
    { uid: 5270, keyword: 'hawai', name: 'Hilo, Hawaii, USA', baseAQI: 20 },
    { uid: 12522, keyword: 'capado', name: 'Cesarea, Israel', baseAQI: 60 },
    { uid: 13656, keyword: 'indonesia', name: 'Muaro Jambi, Indonesia', baseAQI: 85 },
    { uid: 11713, keyword: 'africa', name: 'Mmabatho, South Africa', baseAQI: 45 },
    { uid: 10874, keyword: 'london', name: 'London, UK', baseAQI: 55 },
    { uid: 5372, keyword: 'macau', name: 'Macau', baseAQI: 90 },
    { uid: 9303, keyword: 'auckland', name: 'Auckland, New Zealand', baseAQI: 15 },
  ];

  // Array penampung untuk bulk insert history
  const historyPayload: any[] = [];

  for (const city of citiesData) {
    // A. Upsert Data Kota (Master Data)
    const dbCity = await prisma.monitoredCity.upsert({
      where: { uid: city.uid }, // Menggunakan UID sebagai kunci unik
      update: { 
        stationName: city.name,
        keyword: city.keyword 
      },
      create: {
        uid: city.uid,
        stationName: city.name,
        keyword: city.keyword,
        isActive: true,
      },
    });

    console.log(`📍 Processing City: ${dbCity.stationName} (ID: ${dbCity.id})`);

    // B. Generate History 30 Hari Kebelakang
    const today = new Date();
    let currentDummyAQI = city.baseAQI; // Start point grafik

    for (let i = 30; i >= 0; i--) {
      // Mundur i hari dari sekarang
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      
      // Set jam random biar gak semua tepat jam 00:00 (misal antara jam 8 pagi - 8 malam)
      date.setHours(8 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 59));

      // Generate AQI (fluktuatif naik turun dikit dari hari sebelumnya)
      currentDummyAQI = getRandomAQI(currentDummyAQI, 30); 
      const category = determineCategory(currentDummyAQI);

      // Push ke payload
      historyPayload.push({
        monitoredCityId: dbCity.id,
        aqi: currentDummyAQI,
        category: category,
        recordedAt: date,
        SyncedAt: new Date(), // Waktu script dijalankan
      });

      // C. Jika ini adalah data hari ini (i === 0), update tabel snapshot "AirQuality"
      if (i === 0) {
        await prisma.airQuality.upsert({
          where: { monitoredCityId: dbCity.id },
          update: {
            aqi: currentDummyAQI,
            category: category,
            recordedAt: date,
          },
          create: {
            monitoredCityId: dbCity.id,
            aqi: currentDummyAQI,
            category: category,
            recordedAt: date,
          },
        });
      }
    }
  }

  // D. Bulk Insert History (Biar cepat)
  console.log(`📦 Inserting ${historyPayload.length} history records...`);
  
  // Menggunakan createMany dengan skipDuplicates agar aman jika dijalankan ulang
  await prisma.airQualityHistory.createMany({
    data: historyPayload,
    skipDuplicates: true, 
  });

  console.log('✅ Seeding Completed! Data History & Snapshot updated.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });