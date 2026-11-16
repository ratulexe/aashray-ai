import { describe, expect, it } from "vitest";
import { createDb, migrate, resetSchema } from "./index";
import { seedDemo } from "./seed/demo";

describe("resetSchema", () => {
  it("can reset repeatedly on one connection and spatial queries keep working", async () => {
    const db = await createDb({ dataDir: "memory" });
    try {
      await migrate(db);
      await seedDemo(db);
      await resetSchema(db);
      await seedDemo(db);
      await resetSchema(db);
      const { citizens } = await seedDemo(db);
      expect(citizens).toBe(503);
      // Regression: dropping the PostGIS extension mid-session broke ST_Intersects.
      const [row] = await db.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM citizens c JOIN admin_areas a ON a.level = 'block'
          WHERE ST_Intersects(c.home_point::geometry, a.geom)`,
      );
      expect(row?.n).toBeGreaterThan(400);
    } finally {
      await db.close();
    }
  });
});
