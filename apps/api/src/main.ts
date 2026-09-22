import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { AppModule } from "./app.module.js";
import { loadRuntimeConfig } from "./config.js";

const runtimeConfig = loadRuntimeConfig();
const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), { cors: false });
app.setGlobalPrefix("api/v1");
app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
app.enableCors({
  origin: [/^http:\/\/127\.0\.0\.1:\d+$/, /^http:\/\/localhost:\d+$/],
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Idempotency-Key", "X-Demo-User"],
});
const port = Number(process.env["PORT"] ?? 4300);
await app.listen(port, "127.0.0.1");
console.log(`ASTRA ${runtimeConfig.financialMode} API listening on http://127.0.0.1:${port}/api/v1`);
