// Fills a database with a few real, live Shops so the home page has something to show.
// Also run on Neon `production`, so only add real Shops here, never fake test data.
import { inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { ratings, shops } from "../db/schema.ts";

// Own connection: plain `node` can't resolve `@/` imports, so @/db/client isn't usable here.
const db = drizzle(process.env.DATABASE_URL!);

await db
  .insert(shops)
  .values([
    {
      name: "Satan's Coffee Corner",
      slug: "satans-coffee-corner",
      address: "Carrer de l'Arc de Sant Ramon del Call, 11",
      status: "live",
    },
    {
      name: "Nømad Coffee Lab",
      slug: "nomad-coffee-lab",
      address: "Passatge Sert, 12",
      instagramOrWebsite: "https://nomadcoffee.es",
      status: "live",
    },
    {
      name: "SlowMov",
      slug: "slowmov",
      address: "Carrer de Luis Antúnez, 18",
      status: "live",
    },
    {
      name: "Onna Coffee",
      slug: "onna-coffee",
      address: "Carrer de Santa Teresa, 1",
      status: "live",
    },
  ])
  // Safe to run again: Shops whose slug already exists are skipped.
  .onConflictDoNothing();

console.log("Seeded Shops.");

// Sample Ratings are fake, so they only go into a database on this computer, never Neon.
if (new URL(process.env.DATABASE_URL!).hostname === "localhost") {
  // Stars from each sample Member, per Shop slug. Onna has none, so it shows as Unrated.
  const sampleStars: Record<string, number[]> = {
    "nomad-coffee-lab": [5, 5, 4, 5, 4, 5],
    "satans-coffee-corner": [5, 4, 4, 5],
    slowmov: [4, 3, 4],
  };

  const seededShops = await db
    .select({ id: shops.id, slug: shops.slug })
    .from(shops)
    .where(inArray(shops.slug, Object.keys(sampleStars)));

  await db
    .insert(ratings)
    .values(
      seededShops.flatMap((shop) =>
        sampleStars[shop.slug].map((stars, i) => ({
          memberId: `sample-member-${i + 1}`,
          shopId: shop.id,
          stars,
        })),
      ),
    )
    // Safe to run again: a Member's existing Rating for a Shop is skipped.
    .onConflictDoNothing();

  console.log("Seeded sample Ratings.");
}

await db.$client.end();
