import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { HttpError, parseId } from '../utils/HttpError.js';

export const createPlayer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { nickname } = req.body ?? {};
    if (typeof nickname !== 'string' || !nickname.trim()) throw new HttpError(400, 'Nickname wajib diisi');

    const exist = await prisma.player.findUnique({ where: { nickname } });
    if (exist) throw new HttpError(409, 'Nickname sudah dipakai');

    const player = await prisma.player.create({ data: { nickname } });
    res.status(201).json({ status: true, message: 'Player berhasil dibuat', data: player });
  } catch (err) { next(err); }
};

export const getPlayerDetail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseId(req.params.player_id);
    const player = id ? await prisma.player.findUnique({
      where: { id },
      include: { heroes: { include: { hero: { select: { name: true } } } } },
    }) : null;
    if (!player) throw new HttpError(404, 'Player tidak ditemukan');

    const formattedHeroes = player.heroes.map(ph => ({
      heroId: ph.heroId,
      name: ph.hero.name,
      currency: ph.currency,
      pricePaid: ph.pricePaid,
    }));

    res.status(200).json({
      status: true,
      message: 'Berhasil mengambil data player',
      data: {
        id: player.id,
        nickname: player.nickname,
        bp: player.bp,
        diamond: player.diamond,
        createdAt: player.createdAt,
        heroes: formattedHeroes,
      },
    });
  } catch (err) { next(err); }
};

export const updatePlayer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseId(req.params.player_id);
    const { nickname } = req.body ?? {};

    const player = id ? await prisma.player.findUnique({ where: { id } }) : null;
    if (!player) throw new HttpError(404, 'Player tidak ditemukan');
    if (typeof nickname !== 'string' || !nickname.trim()) throw new HttpError(400, 'Nickname wajib diisi');

    const exist = await prisma.player.findUnique({ where: { nickname } });
    if (exist && exist.id !== id) throw new HttpError(409, 'Nickname sudah dipakai');

    const updated = await prisma.player.update({ where: { id: id! }, data: { nickname } });
    res.status(200).json({ status: true, message: 'Nickname berhasil diperbarui', data: updated });
  } catch (err) { next(err); }
};

export const deletePlayer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseId(req.params.player_id);
    const player = id ? await prisma.player.findUnique({ where: { id } }) : null;
    if (!player) throw new HttpError(404, 'Player tidak ditemukan');

    await prisma.player.delete({ where: { id: id! } });
    res.status(200).json({ status: true, message: 'Player berhasil dihapus' });
  } catch (err) { next(err); }
};