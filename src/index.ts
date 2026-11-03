import express, { Request, Response, NextFunction } from 'express';
import 'dotenv/config';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';

import { getHeroes, getHeroDetail, createHero } from './controllers/heroController.js';
import { getSkins, getSkinDetail } from './controllers/skinController.js';
import { createPlayer, getPlayerDetail, updatePlayer, deletePlayer } from './controllers/playerController.js';
import { topUpDiamond, playMatch, buyHero } from './controllers/shopController.js';
import { getStatistics } from './controllers/statisticsController.js';

const app = express();
app.use(express.json());

// Logger Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Health Check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: true,
    message: 'Server MLBB Shop berjalan dengan baik',
  });
});

// Hero Endpoints
app.get('/api/heroes', getHeroes);
app.get('/api/heroes/:hero_id', getHeroDetail);
app.post('/api/heroes', createHero);

// Skin Endpoints
app.get('/api/skins', getSkins);
app.get('/api/skins/:skin_id', getSkinDetail);

// Player Endpoints
app.post('/api/players', createPlayer);
app.get('/api/players/:player_id', getPlayerDetail);
app.patch('/api/players/:player_id', updatePlayer);
app.delete('/api/players/:player_id', deletePlayer);

// Top Up & Match Endpoints
app.post('/api/players/:player_id/topup', topUpDiamond);
app.post('/api/players/:player_id/matches', playMatch);

// Buy Hero Endpoint
app.post('/api/players/:player_id/heroes', buyHero);

// Statistics Endpoint
app.get('/api/statistics', getStatistics);

// Error Handlers
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});