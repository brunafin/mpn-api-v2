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
    .build();

  if(process.env.TYPE_ENV === 'development'){
    const documentFactory = () => SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, documentFactory);
  }

  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap().catch((err) => {
  console.error('Error during bootstrap:', err);
});
