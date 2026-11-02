import { Star } from "lucide-react";
import Image from "next/image";
import { connection } from "next/server";
import { Suspense } from "react";
import { getRanking } from "@/lib/ranking";

type RankedShop = Awaited<ReturnType<typeof getRanking>>[number];

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-md px-5 pb-10">
      <h1 className="flex h-16 items-center font-heading text-2xl font-bold">
        Lattely
      </h1>
      <Suspense fallback={<p>Loading Shops…</p>}>
        <RankedShops />
      </Suspense>
    </main>
  );
}

async function RankedShops() {
  await connection(); // read the database on every visit, not once at build time
  const ranking = await getRanking();
  const [first, ...runnersUp] = ranking.slice(0, 3);
  const rest = ranking.slice(3);

  return (
    <>
      <section aria-label="Top three" className="mt-4 flex flex-col gap-3.5">
        {first && <ShopCard shop={first} big />}
        <div className="grid grid-cols-2 gap-3.5">
          {runnersUp.map((shop) => (
            <ShopCard key={shop.id} shop={shop} />
          ))}
        </div>
      </section>

      {rest.length > 0 && (
        <section aria-label="More shops" className="mt-6">
          <h2 className="mb-2 font-heading text-[22px] font-semibold">
            Also worth the walk
          </h2>
          <ol>
            {rest.map((shop) => (
              <li
                key={shop.id}
                className="flex min-h-15 items-center gap-3.5 border-b border-latte"
              >
                <span className="w-6 text-right font-heading text-[17px] font-semibold text-clay">
                  {shop.rank}
                </span>
                <span className="flex-1 font-semibold">{shop.name}</span>
                <AverageRating shop={shop} />
              </li>
            ))}
          </ol>
        </section>
      )}
    </>
  );
}

function ShopCard({ shop, big = false }: { shop: RankedShop; big?: boolean }) {
  return (
    <article className="overflow-hidden rounded-3xl border border-latte bg-paper">
      <div className={`relative ${big ? "h-55" : "h-30"}`}>
        <Image
          src={fallbackImage(shop.id)}
          alt=""
          fill
          className="object-cover"
        />
        <span className="absolute top-3 left-3 rounded-full border border-espresso bg-cream px-3 py-1 font-heading font-bold">
          No. {shop.rank}
        </span>
      </div>
      <div className="flex flex-col gap-1.5 p-4">
        <h3
          className={`font-heading leading-tight font-semibold ${big ? "text-[22px]" : "text-[17px]"}`}
        >
          {shop.name}
        </h3>
        <AverageRating shop={shop} />
      </div>
    </article>
  );
}

function AverageRating({ shop }: { shop: RankedShop }) {
  if (shop.averageRating === null) {
    return <span className="text-sm text-mocha">No ratings yet</span>;
  }
  return (
    <span className="flex items-center gap-1 text-sm font-bold">
      <Star className="size-3.5 fill-clay text-clay" aria-hidden />
      {shop.averageRating.toFixed(1)}
    </span>
  );
}

// shortcut: Shops have no photo column yet, so every Shop uses a fallback; add one when real photos exist.
// Picked from the id, so a Shop always gets the same image.
function fallbackImage(shopId: number) {
  return `/fallbacks/${(shopId % 6) + 1}.svg`;
}
