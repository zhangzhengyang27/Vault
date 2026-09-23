import "reflect-metadata";
import * as bcrypt from "bcryptjs";
import { AppDataSource } from "../../data-source";
import { User } from "../entities/user.entity";

/**
 * 手动创建 / 提升管理员账号
 * 用法：
 *   ts-node src/cli/create-admin.ts --username=admin --password=xxx [--email=xxx]
 *   ts-node src/cli/create-admin.ts --username=admin --reset-password --password=newpass
 * 也可通过环境变量 ADMIN_USERNAME / ADMIN_PASSWORD / ADMIN_EMAIL 传入。
 * 注意：对已存在的用户默认只提升角色（保留原密码），避免意外改密导致账号失效；
 * 需要重置密码时显式加 --reset-password。
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const get = (key: string): string | undefined => {
    const hit = args.find((a) => a.startsWith(`--${key}=`));
    if (hit) return hit.slice(key.length + 3);
    return process.env[`ADMIN_${key.toUpperCase()}`];
  };
  const hasFlag = (key: string): boolean =>
    args.includes(`--${key}`) || args.includes(`--${key}=true`);

  const username = get("username");
  const password = get("password");
  const email = get("email");
  const resetPassword = hasFlag("reset-password");

  if (!username) {
    console.error(
      "用法: ts-node src/cli/create-admin.ts --username=xxx [--password=xxx] [--email=xxx] [--reset-password]",
    );
    process.exit(1);
  }

  if (password !== undefined && password.length < 6) {
    throw new Error("密码长度至少 6 位");
  }

  await AppDataSource.initialize();
  try {
    const repo = AppDataSource.getRepository(User);
    const user = await repo.findOne({ where: { username } });

    if (user) {
      // 已存在：默认只提升角色/解封，保留原密码；仅在 --reset-password 时重置
      user.role = "admin";
      user.status = "active";
      if (resetPassword) {
        if (!password)
          throw new Error("--reset-password 需要同时提供 --password=xxx");
        user.passwordHash = await bcrypt.hash(password, 10);
        await repo.save(user);
        console.log(`已更新用户「${username}」为管理员角色并重置密码`);
      } else {
        await repo.save(user);
        console.log(`已更新用户「${username}」为管理员角色（保留原密码）`);
      }
    } else {
      if (!password) throw new Error("新建账号必须提供 --password=xxx");
      const passwordHash = await bcrypt.hash(password, 10);
      await repo.save(
        repo.create({
          username,
          email: email || null,
          passwordHash,
          role: "admin",
          status: "active",
        }),
      );
      console.log(`已创建管理员账号：${username}`);
    }
  } finally {
    await AppDataSource.destroy();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
