import { ValidationPipe, VersioningType, type INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";

import { GlobalExceptionFilter } from "./common/filters/global-exception.filter";

export function configureApplication(
  app: INestApplication,
  options: { enableSwagger?: boolean } = {}
): void {
  const appUrls = (process.env.APP_URL ?? "http://localhost:5173").split(",");

  app.setGlobalPrefix("api");
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" });
  app.enableCors({ origin: appUrls, credentials: true });
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

  if (options.enableSwagger ?? true) {
    const openApiConfig = new DocumentBuilder()
      .setTitle("PlusOps API")
      .setDescription("Internal developer portal and incident management API.")
      .setVersion("0.1.0")
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, openApiConfig);
    SwaggerModule.setup("api/docs", app, document);
  }
}
