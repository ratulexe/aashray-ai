import { createDb, resetSchema } from "./index";
import { seedDemo } from "./seed/demo";

const command = process.argv[2];

if (command === "reset") {
  const db = await createDb({ url: process.env.DATABASE_URL });
  await resetSchema(db);
  const result = await seedDemo(db);
  console.log(`Demo database ready: ${result.citizens} households, ${result.shelters} shelters.`);
  await db.close();
} else {
  console.log("Usage: tsx src/cli.ts reset");
  process.exit(1);
}
