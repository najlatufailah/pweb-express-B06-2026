import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { HttpError, parseId } from '../utils/HttpError.js';

const ROLES = ['TANK', 'FIGHTER', 'ASSASSIN', 'MAGE', 'MARKSMAN', 'SUPPORT'];
const LANES = ['EXP', 'GOLD', 'MID', 'JUNGLE', 'ROAM'];

export const getHeroes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 10, 1), 100);
    const search = req.query.search as string;
    const role = req.query.role as any;

    const where: any = {};
    if (search) where.name = { contains: search, mode: 'insensitive' };
    if (role) {
      if (!ROLES.includes(role)) throw new HttpError(400, 'Role tidak valid');
      where.role = role;
    }

    const totalItems = await prisma.hero.count({ where });
    const heroes = await prisma.hero.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { id: 'asc' },
    });

    res.status(200).json({
      status: true,
      message: 'Berhasil mengambil data hero',
      data: heroes,
      metadata: {
        currentPage: page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
      },
    });
  } catch (err) { next(err); }
};

export const getHeroDetail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseId(req.params.hero_id);
    const hero = id ? await prisma.hero.findUnique({
      where: { id },
      include: { skins: true },
    }) : null;

    if (!hero) throw new HttpError(404, 'Hero tidak ditemukan');

    res.status(200).json({
      status: true,
      message: 'Berhasil mengambil detail hero',
      data: hero,
    });
  } catch (err) { next(err); }
};

export const createHero = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, role, lane, releaseYear, priceBP, priceDiamond } = req.body ?? {};

    if (!name || !role || !lane || !releaseYear) {
      throw new HttpError(400, 'Data hero tidak lengkap');
    }

    if (!ROLES.includes(role) || !LANES.includes(lane) || !Number.isInteger(releaseYear)) {
      throw new HttpError(400, 'role/lane/releaseYear tidak valid');
    }

    const existing = await prisma.hero.findUnique({ where: { name } });
    if (existing) throw new HttpError(409, 'Nama hero sudah ada');

    const hero = await prisma.hero.create({
      data: { name, role, lane, releaseYear, priceBP: priceBP ?? null, priceDiamond: priceDiamond ?? null },
    });

    res.status(201).json({
      status: true,
      message: 'Hero berhasil ditambahkan',
      data: hero,
    });
  } catch (err) { next(err); }
};