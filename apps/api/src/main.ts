import "reflect-metadata";

import { ValidationPipe, VersioningType } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";

import { AppModule } from "./app.module";
import { GlobalExceptionFilter } from "./common/filters/global-exception.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const port = Number(process.env.API_PORT ?? 4000);
  const appUrls = (process.env.APP_URL ?? "http://localhost:5173").split(",");

  app.setGlobalPrefix("api");
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: "1"
  });
  app.enableCors({
    origin: appUrls,
    credentials: true
  });
  app.enableShutdownHooks();
  app.use(helmet());
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true
    })
  );
  app.useGlobalFilters(new GlobalExceptionFilter());

  const openApiConfig = new DocumentBuilder()
    .setTitle("PlusOps API")
    .setDescription("Internal developer portal and incident management API.")
    .setVersion("0.1.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, openApiConfig);
  SwaggerModule.setup("api/docs", app, document);

  await app.listen(port);
}

void bootstrap();

