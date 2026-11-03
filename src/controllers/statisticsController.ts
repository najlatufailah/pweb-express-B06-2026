import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';

export const getStatistics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const totalPlayers = await prisma.player.count();
    const totalHeroesOwned = await prisma.playerHero.count();

    const aggregateDiamond = await prisma.player.aggregate({
      _sum: { diamond: true },
    });

    const mostOwned = await prisma.playerHero.groupBy({
      by: ['heroId'],
      _count: { heroId: true },
      orderBy: { _count: { heroId: 'desc' } },
      take: 1,
    });

    let mostOwnedHero = null;
    if (mostOwned.length > 0) {
      const hero = await prisma.hero.findUnique({ where: { id: mostOwned[0].heroId } });
      mostOwnedHero = {
        heroId: hero?.id,
        name: hero?.name,
        owners: mostOwned[0]._count.heroId,
      };
    }

    const heroesPerRoleGroup = await prisma.hero.groupBy({
      by: ['role'],
      _count: { role: true },
    });

    const heroesPerRole = heroesPerRoleGroup.map((g) => ({
      role: g.role,
      total: g._count.role,
    }));

    res.status(200).json({
      status: true,
      message: 'Berhasil mengambil statistik',
      data: {
        totalPlayers,
        totalHeroesOwned,
        totalDiamond: aggregateDiamond._sum.diamond || 0,
        mostOwnedHero,
        heroesPerRole,
      },
    });
  } catch (err) {
    next(err);
  }
};