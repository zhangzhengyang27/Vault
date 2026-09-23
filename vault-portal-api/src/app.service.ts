import { Injectable } from "@nestjs/common";

@Injectable()
export class AppService {
  getHello(): { status: string; service: string; time: string } {
    return {
      status: "ok",
      service: "vault-portal-api",
      time: new Date().toISOString(),
    };
  }
}
