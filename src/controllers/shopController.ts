import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { HttpError } from '../utils/HttpError';

export const topUpDiamond = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const playerId = parseInt(req.params.player_id as string);
    const { amount } = req.body;

    if (!amount || typeof amount !== 'number' || amount <= 0 || !Number.isInteger(amount)) {
      throw new HttpError(400, 'Amount top up harus berupa bilangan bulat lebih dari 0');
    }

    const player = await prisma.player.findUnique({ where: { id: playerId } });
    if (!player) {
      throw new HttpError(404, 'Player tidak ditemukan');
    }

    const updatedPlayer = await prisma.player.update({
      where: { id: playerId },
      data: { diamond: { increment: amount } },
    });

    res.status(200).json({
      status: true,
      message: 'Top up berhasil',
      data: {
        playerId,
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
    const playerId = parseInt(req.params.player_id as string);
    const { result } = req.body;

    if (result !== 'WIN' && result !== 'LOSE') {
      throw new HttpError(400, 'Result match harus WIN atau LOSE');
    }

    const player = await prisma.player.findUnique({ where: { id: playerId } });
    if (!player) {
      throw new HttpError(404, 'Player tidak ditemukan');
    }

    const bpEarned = result === 'WIN' ? 300 : 100;

    const updatedPlayer = await prisma.player.update({
      where: { id: playerId },
      data: { bp: { increment: bpEarned } },
    });

    res.status(200).json({
      status: true,
      message: 'Hadiah match berhasil ditambahkan',
      data: {
        playerId,
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
    const playerId = parseInt(req.params.player_id as string);
    const { heroId, currency } = req.body;

    if (!heroId || (currency !== 'BP' && currency !== 'DIAMOND')) {
      throw new HttpError(400, 'heroId dan currency (BP/DIAMOND) wajib diisi');
    }

    const player = await prisma.player.findUnique({ where: { id: playerId } });
    if (!player) throw new HttpError(404, 'Player tidak ditemukan');

    const hero = await prisma.hero.findUnique({ where: { id: heroId } });
    if (!hero) throw new HttpError(404, 'Hero tidak ditemukan');

    const price = currency === 'BP' ? hero.priceBP : hero.priceDiamond;
    if (price === null) {
      throw new HttpError(400, `Hero ${hero.name} tidak bisa dibeli dengan ${currency}`);
    }

    const owned = await prisma.playerHero.findUnique({
      where: { playerId_heroId: { playerId, heroId } },
    });
    if (owned) throw new HttpError(409, 'Player sudah memiliki hero ini');

    const balance = currency === 'BP' ? player.bp : player.diamond;
    if (balance < price) {
      throw new HttpError(400, 'Saldo tidak mencukupi');
    }

    const [updatedPlayer] = await prisma.$transaction([
      prisma.player.update({
        where: { id: playerId },
        data: currency === 'BP' ? { bp: { decrement: price } } : { diamond: { decrement: price } },
      }),
      prisma.playerHero.create({
        data: { playerId, heroId, currency, pricePaid: price },
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
  } catch (err) { next(err); }
};