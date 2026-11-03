import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { HttpError, parseId } from '../utils/HttpError.js';

export const topUpDiamond = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const playerId = parseId(req.params.player_id);
    const { amount } = req.body ?? {};

    // 1. amount harus bilangan bulat > 0
    if (typeof amount !== 'number' || !Number.isInteger(amount) || amount <= 0) {
      throw new HttpError(400, 'Amount top up harus berupa bilangan bulat lebih dari 0');
    }

    // 2. Player harus ada (id bukan angka dianggap tidak ditemukan)
    const player = playerId ? await prisma.player.findUnique({ where: { id: playerId } }) : null;
    if (!player) throw new HttpError(404, 'Player tidak ditemukan');

    // 3. Tambah diamond dengan increment
    const updatedPlayer = await prisma.player.update({
      where: { id: player.id },
      data: { diamond: { increment: amount } },
    });

    res.status(200).json({
      status: true,
      message: 'Top up berhasil',
      data: {
        playerId: player.id,
        amount,
        diamond: updatedPlayer.diamond,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const playMatch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const playerId = parseId(req.params.player_id);
    const { result } = req.body ?? {};

    // 1. result harus WIN atau LOSE
    if (result !== 'WIN' && result !== 'LOSE') {
      throw new HttpError(400, 'Result match harus WIN atau LOSE');
    }

    // 2. Player harus ada
    const player = playerId ? await prisma.player.findUnique({ where: { id: playerId } }) : null;
    if (!player) throw new HttpError(404, 'Player tidak ditemukan');

    // 3. Tambah BP dengan increment
    const bpEarned = result === 'WIN' ? 300 : 100;
    const updatedPlayer = await prisma.player.update({
      where: { id: player.id },
      data: { bp: { increment: bpEarned } },
    });

    res.status(200).json({
      status: true,
      message: 'Hadiah match berhasil ditambahkan',
      data: {
        playerId: player.id,
        result,
        bpEarned,
        bp: updatedPlayer.bp,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const buyHero = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const playerId = parseId(req.params.player_id);
    const { heroId, currency } = req.body ?? {};

    // 1. heroId wajib bilangan bulat, currency wajib BP/DIAMOND
    if (!Number.isInteger(heroId) || heroId <= 0 || (currency !== 'BP' && currency !== 'DIAMOND')) {
      throw new HttpError(400, 'heroId dan currency (BP/DIAMOND) wajib diisi dengan benar');
    }

    // 2. Player harus ada
    const player = playerId ? await prisma.player.findUnique({ where: { id: playerId } }) : null;
    if (!player) throw new HttpError(404, 'Player tidak ditemukan');

    // 3. Hero harus ada (id terlalu besar juga dianggap tidak ditemukan)
    const validHeroId = parseId(heroId);
    const hero = validHeroId ? await prisma.hero.findUnique({ where: { id: validHeroId } }) : null;
    if (!hero) throw new HttpError(404, 'Hero tidak ditemukan');

    // 4. Harga untuk currency tersebut tidak boleh kosong
    const price = currency === 'BP' ? hero.priceBP : hero.priceDiamond;
    if (price === null) {
      throw new HttpError(400, `Hero ${hero.name} tidak bisa dibeli dengan ${currency}`);
    }

    // 5. Player belum boleh memiliki hero ini
    const owned = await prisma.playerHero.findUnique({
      where: { playerId_heroId: { playerId: player.id, heroId: hero.id } },
    });
    if (owned) throw new HttpError(409, 'Player sudah memiliki hero ini');

    // 6. Saldo harus cukup
    const balance = currency === 'BP' ? player.bp : player.diamond;
    if (balance < price) throw new HttpError(400, 'Saldo tidak mencukupi');

    // Simpan: kurangi saldo + catat PlayerHero dalam satu transaction
    const [updatedPlayer] = await prisma.$transaction([
      prisma.player.update({
        where: { id: player.id },
        data: currency === 'BP' ? { bp: { decrement: price } } : { diamond: { decrement: price } },
      }),
      prisma.playerHero.create({
        data: { playerId: player.id, heroId: hero.id, currency, pricePaid: price },
      }),
    ]);

    res.status(201).json({
      status: true,
      message: 'Hero berhasil dibeli',
      data: {
        hero: { id: hero.id, name: hero.name },
        currency,
        pricePaid: price,
        balance: { bp: updatedPlayer.bp, diamond: updatedPlayer.diamond },
      },
    });
  } catch (err) {
    next(err);
  }
};
