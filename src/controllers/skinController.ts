import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { HttpError, parseId } from '../utils/HttpError.js';

const RARITIES = ['COMMON', 'EXCEPTIONAL', 'DELUXE', 'EXQUISITE', 'GRAND', 'SUPREME'];

export const getSkins = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 10, 1), 100);
    const heroId = req.query.heroId ? parseInt(req.query.heroId as string) : undefined;
    const rarity = req.query.rarity as any;

    const where: any = {};
    if (heroId) where.heroId = heroId;
    if (rarity) {
      if (!RARITIES.includes(rarity)) throw new HttpError(400, 'Rarity tidak valid');
      where.rarity = rarity;
    }

    const totalItems = await prisma.skin.count({ where });
    const skins = await prisma.skin.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: { hero: { select: { name: true } } },
      orderBy: { id: 'asc' },
    });

    res.status(200).json({
      status: true,
      message: 'Berhasil mengambil data skin',
      data: skins,
      metadata: { currentPage: page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) },
    });
  } catch (err) { next(err); }
};

export const getSkinDetail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseId(req.params.skin_id);
    const skin = id ? await prisma.skin.findUnique({ where: { id }, include: { hero: true } }) : null;
    if (!skin) throw new HttpError(404, 'Skin tidak ditemukan');
    res.status(200).json({ status: true, message: 'Berhasil mengambil detail skin', data: skin });
  } catch (err) { next(err); }
};