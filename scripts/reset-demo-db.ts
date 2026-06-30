import fs from "node:fs/promises";
import path from "node:path";

async function main() {
  const dbPath = path.join(process.cwd(), "prisma", "dev.db");
  await fs.rm(dbPath, { force: true });
  await fs.rm(`${dbPath}-journal`, { force: true });
  await fs.rm(`${dbPath}-wal`, { force: true });
  await fs.rm(`${dbPath}-shm`, { force: true });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
