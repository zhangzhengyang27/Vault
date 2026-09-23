import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// 手动加载 .env（避免引入 dotenv 依赖，@nestjs/config 已内置）
try {
  const envPath = resolve(__dirname, '.env');
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2]?.replace(/^["']|["']$/g, '') ?? '';
    }
  }
} catch {
  // .env 不存在时忽略，依赖环境变量
}

export const AppDataSource = new DataSource({
  type: 'postgres',
  // 不提供本机默认值：静默连错库比启动失败更危险
  url: process.env.DATABASE_URL,
  entities: [__dirname + '/src/entities/*.entity.{ts,js}'],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  synchronize: false,
});
