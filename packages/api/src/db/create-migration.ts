import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const name = process.argv[2];
if (!name) {
  console.error("Usage: pnpm db:create <migration-name>");
  process.exit(1);
}

const timestamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
const filename = `${timestamp}_${name}.ts`;
const filepath = path.join(__dirname, "migrations", filename);

const template = `import { Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  // Write your migration here
}

export async function down(db: Kysely<any>): Promise<void> {
  // Write your rollback here
}
`;

await fs.writeFile(filepath, template);
console.log(`Created: src/db/migrations/${filename}`);
