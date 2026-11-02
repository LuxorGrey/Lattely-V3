import { asc, count, desc, eq, getTableColumns, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { ratings, shops } from "@/db/schema";

// How many "average" Ratings every Shop starts with, so one 5-star Rating can't top the Ranking.
const PRIOR_WEIGHT = 5;

export async function getRanking() {
  const averageOfAllRatings = sql`(select avg(${ratings.stars}) from ${ratings} join ${shops} on ${shops.id} = ${ratings.shopId} where ${shops.status} = 'live')`;
  // Ranking score: the Shop's own average, pulled towards averageOfAllRatings until it has enough Ratings.
  const rankingScore = sql`(coalesce(sum(${ratings.stars}), 0) + ${PRIOR_WEIGHT} * ${averageOfAllRatings}) / (count(${ratings.stars}) + ${PRIOR_WEIGHT})`;
  const isUnrated = sql`count(${ratings.stars}) = 0`;

  const rows = await db
    .select({
      ...getTableColumns(shops),
      averageRating: sql<
        number | null
      >`round(avg(${ratings.stars}), 1)`.mapWith(Number),
      ratingCount: count(ratings.stars),
    })
    .from(shops)
    .leftJoin(ratings, eq(ratings.shopId, shops.id))
    .where(eq(shops.status, "live"))
    .groupBy(shops.id)
    .orderBy(
      asc(isUnrated), // false sorts before true, so Unrated Shops go last
      desc(rankingScore),
      asc(shops.name), // name breaks ties, so the order never jumps around
    );

  return rows.map((shop, i) => ({ ...shop, rank: i + 1 }));
}
