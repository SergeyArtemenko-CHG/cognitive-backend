# Cognitive Battery API

Изолированный Express + TypeScript бэкенд. SQLite-файл `database.sqlite` лежит в этой папке. Порт по умолчанию **4000**.

## Файлы

- `package.json`
- `tsconfig.json`
- `src/db.ts` — схема, `seed()`, путь к `database.sqlite`
- `src/server.ts` — Express и JSON API

## Ubuntu

```bash
sudo apt-get install -y build-essential python3
cd /opt/cognitive-battery-api
cp .env.example .env
npm install
npm start
```

На Windows для `better-sqlite3` нужен Visual Studio Build Tools (C++). На сервере достаточно `build-essential`.

`.env`: `PORT=4000`, `HOST=127.0.0.1` — не пересекается с 80/443 и MQTT 1883. Снаружи — nginx `proxy_pass http://127.0.0.1:4000`.

## API

```bash
curl http://127.0.0.1:4000/health
curl http://127.0.0.1:4000/api/exercises/logic/random
curl http://127.0.0.1:4000/api/exercises/mednick/random
curl http://127.0.0.1:4000/api/exercises/soobrazhariy/pack
```
