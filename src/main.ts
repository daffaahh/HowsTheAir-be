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

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

// --- CONFIG SWAGGER (VERCEL FRIENDLY) ---
  const config = new DocumentBuilder()
    .setTitle('HowsTheAir API')
    .setDescription('Dokumentasi API untuk Tes Dashboard Analitik')
    .setVersion('1.0')
    .addTag('Air Quality')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
      customSiteTitle: 'HTA API Docs',
      customJs: [
        'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-bundle.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-standalone-preset.min.js',
      ],
      customCssUrl: [
        'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui.min.css',
        'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-standalone-preset.min.css',
        'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui.css',
      ],
    });

  // app.enableCors(); // Jangan lupa CORS biar FE bisa akses
  await app.listen(3333);
}
bootstrap();