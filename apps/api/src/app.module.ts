import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller.js";
import { DemoController } from "./demo.controller.js";
import { DemoService } from "./demo.service.js";

@Module({ controllers: [HealthController, DemoController], providers: [DemoService] })
export class AppModule {}
