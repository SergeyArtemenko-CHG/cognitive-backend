import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { openDatabase } from './db.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(projectRoot, '.env') });

function readPort(raw: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(raw ?? '', 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    return fallback;
  }
  return parsed;
}

const PORT = readPort(process.env.PORT, 4000);
const HOST = process.env.HOST?.trim() || '127.0.0.1';
const NODE_ENV = process.env.NODE_ENV ?? 'production';
const CORS_ORIGIN = process.env.CORS_ORIGIN?.trim() || '';
const API_KEY = process.env.API_KEY?.trim() || '';

const { db, seeded } = openDatabase();

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', false);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: true,
  }),
);

app.use(
  cors({
    origin: CORS_ORIGIN ? CORS_ORIGIN.split(',').map((item) => item.trim()) : false,
    methods: ['GET'],
    allowedHeaders: ['Content-Type', 'X-Api-Key'],
    maxAge: 600,
  }),
);

app.use(express.json({ limit: '16kb' }));
app.use(
  rateLimit({
    windowMs: 60_000,
    limit: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'rate_limited' },
  }),
);

if (API_KEY) {
  app.use('/api', (req, res, next) => {
    if (req.header('x-api-key') !== API_KEY) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }
    next();
  });
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'cognitive-battery-api' });
});

app.get('/api/exercises/logic/random', (_req, res) => {
  const row = db
    .prepare(
      'SELECT id, question, options_json, correct_option, explanation FROM logic_tasks ORDER BY RANDOM() LIMIT 1',
    )
    .get() as
    | {
        id: number;
        question: string;
        options_json: string;
        correct_option: string;
        explanation: string;
      }
    | undefined;

  if (!row) {
    res.status(404).json({ error: 'logic_empty' });
    return;
  }

  res.json({
    id: row.id,
    question: row.question,
    options: JSON.parse(row.options_json) as string[],
    correctOption: row.correct_option,
    explanation: row.explanation,
  });
});

app.get('/api/exercises/mednick/random', (_req, res) => {
  const row = db
    .prepare(
      'SELECT id, word1, word2, word3, valid_answers_json FROM mednick_tasks ORDER BY RANDOM() LIMIT 1',
    )
    .get() as
    | {
        id: number;
        word1: string;
        word2: string;
        word3: string;
        valid_answers_json: string;
      }
    | undefined;

  if (!row) {
    res.status(404).json({ error: 'mednick_empty' });
    return;
  }

  res.json({
    id: row.id,
    words: [row.word1, row.word2, row.word3],
    validAnswers: JSON.parse(row.valid_answers_json) as string[],
  });
});

app.get('/api/exercises/soobrazhariy/pack', (_req, res) => {
  const rows = db
    .prepare('SELECT id, name FROM categories ORDER BY RANDOM() LIMIT 20')
    .all() as { id: number; name: string }[];

  res.json({
    count: rows.length,
    categories: rows.map((row) => ({ id: row.id, name: row.name })),
  });
});

app.use((_req, res) => {
  res.status(404).json({ error: 'not_found' });
});

app.use(
  (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (NODE_ENV !== 'production') {
      console.error(err);
    }
    res.status(500).json({ error: 'internal_error' });
  },
);

const server = app.listen(PORT, HOST, () => {
  console.log(
    `cognitive-battery-api http://${HOST}:${PORT}` + (seeded ? ' (database.sqlite seeded)' : ''),
  );
});

function shutdown(signal: string): void {
  console.log(`received ${signal}, closing`);
  server.close(() => {
    db.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
