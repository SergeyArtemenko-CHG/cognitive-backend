# Cognitive Battery API

Изолированный Express + TypeScript бэкенд. SQLite-файл `database.sqlite` лежит в этой папке. Порт по умолчанию **4000**.

## Файлы

- `package.json`
- `tsconfig.json`
- `src/db.ts` — схема, `seed()`, путь к `database.sqlite`
- `src/server.ts` — Express и JSON API

## Запуск (Node 22.5+, лучше 24)

SQLite — встроенный модуль `node:sqlite`, без npm-драйверов и без компиляции.

```bash
cd /opt/cognitive-battery-api
cp .env.example .env
npm install
npm start
```

`.env`: `PORT=4000`, `HOST=127.0.0.1` — не пересекается с 80/443 и MQTT 1883. Снаружи — nginx `proxy_pass http://127.0.0.1:4000`.

## API

```bash
curl http://127.0.0.1:4000/health
curl http://127.0.0.1:4000/api/exercises/logic/random
curl http://127.0.0.1:4000/api/exercises/mednick/random
curl http://127.0.0.1:4000/api/exercises/soobrazhariy/pack
```
