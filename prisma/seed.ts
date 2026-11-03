import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '../src/generated/prisma/client.js';

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const load = (f: string) =>
  JSON.parse(readFileSync(join(process.cwd(), 'data', f), 'utf-8'));

async function main() {
  const heroes = load('heroes.json');
  const skins = load('skins.json');

  // 1. Kosongkan semua tabel + reset id
  await prisma.$executeRawUnsafe(
    'TRUNCATE "PlayerHero", "Player", "Skin", "Hero" RESTART IDENTITY CASCADE'
  );

  // 2. Hero (id otomatis: Miya=1 ... Hirara=133)
  await prisma.hero.createMany({
    data: heroes.map((h: any) => ({
      name: h.name,
      role: h.primaryRole,
      lane: h.primaryLane,
      releaseYear: h.releaseYear,
      priceBP: h.priceBP ?? null,
      priceDiamond: h.priceDiamond ?? null,
    })),
  });

  // 3. Skin
  await prisma.skin.createMany({
    data: skins.map((s: any) => ({
      name: s.name,
      heroId: s.heroId,
      rarity: s.rarity,
      priceDiamond: s.priceDiamond ?? null,
    })),
  });

  // 4. Player (id eksplisit 1..3, jadi sequence perlu disamakan)
  await prisma.player.createMany({
    data: [
      { id: 1, nickname: 'ArekITS', bp: 1500, diamond: 75 },
      { id: 2, nickname: 'SangPushRank', bp: 13000, diamond: 2892 },
      { id: 3, nickname: 'MageSurabaya', bp: 10000, diamond: 0 },
    ],
  });
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"Player"', 'id'), (SELECT MAX(id) FROM "Player"))`
  );

  await prisma.playerHero.createMany({
    data: [
      { playerId: 1, heroId: 18, currency: 'BP', pricePaid: 2000 },
      { playerId: 1, heroId: 1, currency: 'BP', pricePaid: 10800 },
      { playerId: 2, heroId: 84, currency: 'DIAMOND', pricePaid: 599 },
      { playerId: 2, heroId: 56, currency: 'BP', pricePaid: 32000 },
    ],
  });

  console.log(
    `Seed selesai: ${await prisma.hero.count()} hero, ${await prisma.skin.count()} skin, ${await prisma.player.count()} player, ${await prisma.playerHero.count()} playerHero`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());