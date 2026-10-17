import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import morgan from 'morgan';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Security & logging (helmet and morgan are plugged in directly: the
  // @nest-middlewares/* wrappers are deprecated and incompatible with helmet 8).
  const cdn = 'https://cdn.jsdelivr.net';
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          scriptSrc: ["'self'", "'unsafe-inline'", cdn], // 'unsafe-inline' is required by Swagger UI
          styleSrc: ["'self'", "'unsafe-inline'", cdn, 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", cdn, 'https://fonts.gstatic.com', 'data:'],
          imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
          upgradeInsecureRequests: null, // the app runs over plain http locally
        },
      },
    }),
  );
  app.use(morgan('dev'));
  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  // Bootstrap frontend served from /public
  app.useStaticAssets(join(process.cwd(), 'public'));

  // Swagger: GET /api
  const swagger = new DocumentBuilder()
    .setTitle('Folio — Library API')
    .setDescription('Books, authors, categories, favorites and users')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api', app, SwaggerModule.createDocument(app, swagger));

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  new Logger('Bootstrap').log(`App: http://localhost:${port}  |  Swagger: http://localhost:${port}/api`);
}
bootstrap();
