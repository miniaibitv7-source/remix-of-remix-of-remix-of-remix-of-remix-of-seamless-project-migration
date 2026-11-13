import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { expect, it } from "vitest";

it("keeps the migrated doors and quadrupled house areas aligned with the playable map", async () => {
  const scope: any = {};
  runInNewContext(readFileSync("public/housing.js", "utf8"), scope);
  const game = readFileSync("public/reinos.html", "utf8");
  runInNewContext(game.slice(game.indexOf("const DISTRICTS="), game.indexOf("const HOUSE_LIST=")) + ";globalThis.rows=HOUSES", scope);
  const expected = scope.LawlHousing.catalog(scope.rows).map(({id,x,y,w,h,dx,dy,ax,ay,sqm}: any) => ({id,x,y,w,h,dx,dy,ax,ay,sqm}));
  const db = new PGlite();
  try {
    const latest = readdirSync("drizzle/migrations").filter((f) => f.endsWith(".sql")).sort()
      .map((f) => readFileSync(`drizzle/migrations/${f}`, "utf8")).filter((sql) => sql.includes("FUNCTION public.lawl_house_catalog()")).pop();
    if (!latest) throw new Error("house catalog migration not found");
    await db.exec(latest.slice(0, latest.indexOf("$function$;") + 11));
    const actual = await db.query("SELECT * FROM public.lawl_house_catalog() ORDER BY substring(id from 6)::int");
    expect(actual.rows).toEqual(expected);
    expect(actual.rows).toHaveLength(22);
  } finally { await db.close(); }
}, 30000);