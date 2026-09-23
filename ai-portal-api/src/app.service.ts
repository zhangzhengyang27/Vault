import { Injectable } from "@nestjs/common";

@Injectable()
export class AppService {
  getHello(): { status: string; service: string; time: string } {
    return {
      status: "ok",
      service: "ai-portal-api",
      time: new Date().toISOString(),
    };
  }
}
