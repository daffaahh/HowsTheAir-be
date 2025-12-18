import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'; // 1. Import ini
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // Hapus field yang tidak ada di DTO (Security cleaning)
    forbidNonWhitelisted: true, // Throw error kalau ada field sampah dikirim
    transform: true, // Otomatis transform payload ke instance DTO
  }));

  // --- SETUP SWAGGER MULAI ---
  const config = new DocumentBuilder()
    .setTitle('HowsTheAir API')
    .setDescription('Dokumentasi API untuk Tes Dashboard Analitik')
    .setVersion('1.0')
    .addTag('Air Quality') // Optional: biar rapi
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document); 
  // 'api' adalah URL path-nya nanti (localhost:3000/api)
  // --- SETUP SWAGGER SELESAI ---

  app.enableCors(); // Jangan lupa CORS biar FE bisa akses
  await app.listen(3333);
}
bootstrap();