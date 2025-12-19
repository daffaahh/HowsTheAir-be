// import { PrismaClient } from '@prisma/client';
// const prisma = new PrismaClient();

// async function main() {
//   console.log('🌱 Starting International Seeding...');

//   // KITA GANTI KE KOTA GLOBAL (Data Pasti Ada)
//   const citiesData = [
//     { name: 'Beijing, China', keyword: 'beijing' },        // Sering polusi (Bagus buat tes warna merah/ungu)
//     { name: 'Shanghai, China', keyword: 'shanghai' },
//     { name: 'New York, USA', keyword: 'new-york' },        // Biasanya bersih (Hijau)
//     { name: 'London, UK', keyword: 'london' },             // Moderate
//     { name: 'New Delhi, India', keyword: 'delhi' },        // Sering Hazardous (Ungu/Maroon)
//     { name: 'Seoul, South Korea', keyword: 'seoul' },
//     { name: 'Tokyo, Japan', keyword: 'tokyo' },
//   ];

//   for (const city of citiesData) {
//     // 1. Upsert Kota
//     const dbCity = await prisma.monitoredCity.upsert({
//       where: { keyword: city.keyword },
//       update: { stationName: city.name }, // Update nama biar rapi
//       create: {
//         stationName: city.name,
//         keyword: city.keyword,
//         isActive: true,
//       },
//     });

//     console.log(`📍 Processing City: ${city.name}`);

//   }

//   console.log('✅ Seeding Completed! Data International siap.');
// }

// // Helper Kategori
// function determineCategory(aqi: number): string {
//   if (aqi <= 50) return 'Good';
//   if (aqi <= 100) return 'Moderate';
//   if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
//   if (aqi <= 200) return 'Unhealthy';
//   if (aqi <= 300) return 'Very Unhealthy';
//   return 'Hazardous';
// }

// main()
//   .catch((e) => {
//     console.error(e);
//     process.exit(1);
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });