import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import createDatabaseIfNotExists from './database-init';

async function bootstrap() {
  await createDatabaseIfNotExists();

  const app = await NestFactory.create(AppModule);

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

  app.useGlobalFilters(new HttpExceptionFilter());

// app.enableCors({
//   origin: ['https://sistemamarcapranos-stable.up.railway.app', 'https://marcapranos.up.railway.app', 'https://sistema.marcapranos.com.br', 'https://marcapranos.com.br', 'http://localhost:5173'],
//   methods: 'GET,POST,PUT,DELETE',
// });

app.enableCors({ origin: '*' })

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap().catch((err) => {
  console.error('Error during bootstrap:', err);
});
