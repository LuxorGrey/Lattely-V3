import { afterAll, beforeEach, expect, test } from "vitest";
import { db } from "@/db/client";
import { ratings, shops } from "@/db/schema";
import { getRanking } from "@/lib/ranking";

// Every test starts from no Shops and no Ratings.
beforeEach(async () => {
  await db.delete(ratings);
  await db.delete(shops);
});

afterAll(() => db.$client.end());

async function addLiveShop(name: string) {
  const [shop] = await db
    .insert(shops)
    .values({ name, slug: name, address: "Carrer 1", status: "live" })
    .returning();
  return shop;
}

// `count` Ratings of `stars`, each from a different Member.
async function rate(shopId: number, stars: number, count: number) {
  await db.insert(ratings).values(
    Array.from({ length: count }, (_, i) => ({
      memberId: `member-${i}`,
      shopId,
      stars,
    })),
  );
}

test("the Ranking only includes live Shops", async () => {
  await db.insert(shops).values([
    {
      name: "Live Shop",
      slug: "live-shop",
      address: "Carrer 1",
      status: "live",
    },
    {
      name: "Closed Shop",
      slug: "closed-shop",
      address: "Carrer 2",
      status: "closed",
    },
    {
      name: "Pending Shop",
      slug: "pending-shop",
      address: "Carrer 3",
      status: "pending",
    },
  ]);

  const ranking = await getRanking();

  expect(ranking.map((shop) => shop.name)).toEqual(["Live Shop"]);
});

test("many good Ratings beat one 5-star Rating", async () => {
  const oneStarWonder = await addLiveShop("One Star Wonder");
  const steadyFavourite = await addLiveShop("Steady Favourite");
  const lowRated = await addLiveShop("Low Rated");
  await rate(oneStarWonder.id, 5, 1);
  await rate(steadyFavourite.id, 4, 10);
  await rate(lowRated.id, 2, 10);

  const ranking = await getRanking();

  expect(
    ranking.map(({ rank, name, averageRating, ratingCount }) => ({
      rank,
      name,
      averageRating,
      ratingCount,
    })),
  ).toEqual([
    { rank: 1, name: "Steady Favourite", averageRating: 4, ratingCount: 10 },
    { rank: 2, name: "One Star Wonder", averageRating: 5, ratingCount: 1 },
    { rank: 3, name: "Low Rated", averageRating: 2, ratingCount: 10 },
  ]);
});

test("Unrated Shops come after every rated Shop", async () => {
  await addLiveShop("A Brand New Shop"); // first alphabetically, so name can't put it last
  const lowRated = await addLiveShop("Low Rated");
  const loved = await addLiveShop("Loved");
  await rate(lowRated.id, 2, 10);
  await rate(loved.id, 5, 2);
  await db
    .insert(ratings)
    .values({ memberId: "member-2", shopId: loved.id, stars: 4 }); // 4.666… shows as 4.7

  const ranking = await getRanking();

  expect(
    ranking.map(({ rank, name, averageRating, ratingCount }) => ({
      rank,
      name,
      averageRating,
      ratingCount,
    })),
  ).toEqual([
    { rank: 1, name: "Loved", averageRating: 4.7, ratingCount: 3 },
    { rank: 2, name: "Low Rated", averageRating: 2, ratingCount: 10 },
    { rank: 3, name: "A Brand New Shop", averageRating: null, ratingCount: 0 },
  ]);
});

test("only live Shops' Ratings count towards the average of all Ratings", async () => {
  const oneStarWonder = await addLiveShop("One Star Wonder");
  const steadyFavourite = await addLiveShop("Steady Favourite");
  const [closed] = await db
    .insert(shops)
    .values({
      name: "Closed",
      slug: "closed",
      address: "Carrer 2",
      status: "closed",
    })
    .returning();
  await rate(oneStarWonder.id, 5, 1);
  await rate(steadyFavourite.id, 4, 3);
  await rate(closed.id, 1, 10);

  const ranking = await getRanking();

  // Live average = 17 ÷ 4 = 4.25, so One Star Wonder ≈ 4.38 beats Steady Favourite ≈ 4.16.
  // Counting the closed Shop (27 ÷ 14 ≈ 1.93) would flip them: ≈ 2.44 vs ≈ 2.70.
  expect(ranking.map((shop) => shop.name)).toEqual([
    "One Star Wonder",
    "Steady Favourite",
  ]);
});
