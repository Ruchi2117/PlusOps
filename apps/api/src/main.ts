import "reflect-metadata";

import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";
import { configureApplication } from "./configure-application";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const port = Number(process.env.API_PORT ?? 4000);
  configureApplication(app);

  await app.listen(port);
}

void bootstrap();
