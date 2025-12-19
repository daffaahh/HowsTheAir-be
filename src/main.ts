import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'; 
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, 
    forbidNonWhitelisted: true,
    transform: true,
  }));

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

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

  await app.listen(3333);
}
bootstrap();