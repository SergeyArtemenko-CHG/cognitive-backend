import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DATABASE_FILE = path.join(projectRoot, 'database.sqlite');

export type AppDb = Database.Database;

const LOGIC_TASKS = [
  {
    question:
      'Дан числовой ряд:\n2, 3, 5, 8, 13, 21, ?\n\nКакое число следующее? Каждый член — сумма двух предыдущих.',
    options: ['29', '32', '34', '42'],
    correctOption: '34',
    explanation:
      'Это ряд Фибоначчи: каждый следующий член равен сумме двух предыдущих. 13 + 21 = 34.',
  },
  {
    question:
      'Дан числовой ряд:\n5, 6, 14, 45, 184, ?\n\nПравило: a₁ = 5; aₙ₊₁ = aₙ · n + n, где n — номер уже построенного члена (1, 2, 3, 4, …).\n5·1+1=6; 6·2+2=14; 14·3+3=45; 45·4+4=184.',
    options: ['736', '900', '920', '925'],
    correctOption: '925',
    explanation: 'Следующий шаг: 184 · 5 + 5 = 925.',
  },
  {
    question:
      'Посылки:\n1. Ни один нестабильный индекс не входит в батарею нормирования.\n2. Некоторые индексы латентности нестабильны.\n\nЧто следует с необходимостью?',
    options: [
      'Некоторые индексы латентности не входят в батарею нормирования.',
      'Ни один индекс латентности не входит в батарею нормирования.',
      'Все индексы латентности нестабильны.',
      'Батарея нормирования содержит только стабильные индексы латентности.',
    ],
    correctOption: 'Некоторые индексы латентности не входят в батарею нормирования.',
    explanation:
      'Силлогизм Ferio: ни один нестабильный индекс не в батарее; некоторые индексы латентности нестабильны → некоторые индексы латентности не входят в батарею.',
  },
] as const;

const MEDNICK_TASKS = [
  {
    word1: 'Атомный',
    word2: 'Карманный',
    word3: 'Настенный',
    answers: ['часы', 'час'],
  },
  {
    word1: 'Горький',
    word2: 'Шоколад',
    word3: 'Язык',
    answers: ['плитка', 'плитки'],
  },
  {
    word1: 'Сухой',
    word2: 'Закон',
    word3: 'Паёк',
    answers: ['рацион'],
  },
] as const;

const CATEGORIES = [
  'Животные',
  'Города России',
  'Профессии',
  'Продукты питания',
  'Виды спорта',
  'Музыкальные инструменты',
  'Растения',
  'Транспорт',
  'Одежда',
  'Цвета',
  'Мебель',
  'Посуда',
  'Птицы',
  'Реки',
  'Страны',
  'Науки',
  'Эмоции',
  'Инструменты',
  'Напитки',
  'Части тела',
] as const;

function migrate(db: AppDb): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS logic_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question TEXT NOT NULL,
      options_json TEXT NOT NULL,
      correct_option TEXT NOT NULL,
      explanation TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS mednick_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word1 TEXT NOT NULL,
      word2 TEXT NOT NULL,
      word3 TEXT NOT NULL,
      valid_answers_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );
  `);
}

export function seed(db: AppDb): boolean {
  const row = db.prepare('SELECT COUNT(*) AS n FROM logic_tasks').get() as { n: number };
  if (row.n > 0) {
    return false;
  }

  const insertLogic = db.prepare(
    'INSERT INTO logic_tasks (question, options_json, correct_option, explanation) VALUES (?, ?, ?, ?)',
  );
  const insertMednick = db.prepare(
    'INSERT INTO mednick_tasks (word1, word2, word3, valid_answers_json) VALUES (?, ?, ?, ?)',
  );
  const insertCategory = db.prepare('INSERT INTO categories (name) VALUES (?)');

  const fill = db.transaction(() => {
    for (const task of LOGIC_TASKS) {
      insertLogic.run(
        task.question,
        JSON.stringify(task.options),
        task.correctOption,
        task.explanation,
      );
    }
    for (const task of MEDNICK_TASKS) {
      insertMednick.run(task.word1, task.word2, task.word3, JSON.stringify(task.answers));
    }
    for (const name of CATEGORIES) {
      insertCategory.run(name);
    }
  });

  fill();
  return true;
}

export function openDatabase(): { db: AppDb; seeded: boolean } {
  fs.mkdirSync(path.dirname(DATABASE_FILE), { recursive: true });
  const db = new Database(DATABASE_FILE);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 3000');
  migrate(db);
  const seeded = seed(db);
  return { db, seeded };
}
