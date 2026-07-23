import { NestFactory, Reflector } from '@nestjs/core';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import createDatabaseIfNotExists from './database-init';
import helmet from 'helmet';

async function bootstrap() {
  await createDatabaseIfNotExists();

  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  // Respeita @Exclude() nas entities (ex.: password, token_to_cancel)
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector)),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('Marca pra nós API')
    .setDescription('Rotas para o projeto Marca pra nós')
    .setVersion('1.0')
    .addTag('people')
    .addBearerAuth()
    .build();

  if (process.env.TYPE_ENV === 'development') {
    const documentFactory = () => SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, documentFactory);
  }

  const productionOrigins = [
    'https://sistemamarcapranos-stable.up.railway.app',
    'https://marcapranos.up.railway.app',
    'https://mpnadmin.up.railway.app',
    'https://sistema.marcapranos.com.br',
    'https://marcapranos.com.br',
  ];
  const localOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
  ];

  app.enableCors({
    origin:
      process.env.TYPE_ENV === 'production'
        ? productionOrigins
        : [...productionOrigins, ...localOrigins],
    methods: 'GET,POST,PUT,DELETE,PATCH,OPTIONS',
  });

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap().catch((err) => {
  console.error('Error during bootstrap:', err);
});
