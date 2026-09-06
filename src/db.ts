import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync as Database } from 'node:sqlite';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DATABASE_FILE = path.join(projectRoot, 'database.sqlite');

/** Node 24 class is DatabaseSync; query() is an alias of prepare(). */
export type AppDb = Database & {
  query: Database['prepare'];
};

function sqlQuote(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

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

export function seed(db: AppDb): boolean {
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

  const existing = db.query('SELECT COUNT(*) AS n FROM logic_tasks').get() as
    | { n: number }
    | undefined;
  if ((existing?.n ?? 0) > 0) {
    return false;
  }

  const logicValues = LOGIC_TASKS.map((task) => {
    return `(${sqlQuote(task.question)}, ${sqlQuote(JSON.stringify(task.options))}, ${sqlQuote(task.correctOption)}, ${sqlQuote(task.explanation)})`;
  }).join(',\n');

  const mednickValues = MEDNICK_TASKS.map((task) => {
    return `(${sqlQuote(task.word1)}, ${sqlQuote(task.word2)}, ${sqlQuote(task.word3)}, ${sqlQuote(JSON.stringify(task.answers))})`;
  }).join(',\n');

  const categoryValues = CATEGORIES.map((name) => `(${sqlQuote(name)})`).join(',\n');

  db.exec(`
    INSERT INTO logic_tasks (question, options_json, correct_option, explanation)
    VALUES ${logicValues};

    INSERT INTO mednick_tasks (word1, word2, word3, valid_answers_json)
    VALUES ${mednickValues};

    INSERT INTO categories (name)
    VALUES ${categoryValues};
  `);

  return true;
}

export function openDatabase(): { db: AppDb; seeded: boolean } {
  const db = new Database(DATABASE_FILE) as AppDb;
  db.query = db.prepare.bind(db);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec('PRAGMA busy_timeout = 3000');
  const seeded = seed(db);
  return { db, seeded };
}
