# wntn.music

Музыкальный мини-сайт с треками neverlane и roulse420. Плеер + аккаунты, плейлисты,
лайки, профили артистов, версии треков (демо/релиз/...), тексты с синхронизацией (LRC).

## Стек

- **Фронт:** Vite + React + TS + Tailwind (дизайн в духе cobalt.tools, шрифты IBM Plex + Unbounded)
- **API:** Node + Hono + Drizzle
- **БД:** Postgres 16 · **кэш/сессии:** Redis 7
- **Файлы:** S3-совместимое хранилище (в проде **Cloudflare R2**) — аудио через `/api/audio/:id` (302 → публичный домен бакета)
- **Прокси/TLS:** Caddy · всё в Docker Compose

## Быстрый старт (Docker)

```bash
cp .env.example .env        # впиши SESSION_SECRET, POSTGRES_PASSWORD
docker compose up -d --build
docker compose run --rm api pnpm db:push   # схема
docker compose run --rm api pnpm seed      # импорт треков из public/ в S3
```

Открыть **http://localhost** (Caddy отдаёт фронт и проксит `/api`).

## Локальная разработка (без полного Docker)

Подними только хранилища, остальное на хосте:

```bash
docker compose up -d db redis
cd server && S3_ENDPOINT=http://localhost:9000 \
  DATABASE_URL=postgres://wntn:$POSTGRES_PASSWORD@localhost:5432/wntn \
  REDIS_URL=redis://localhost:6379 SESSION_SECRET=dev pnpm db:push && pnpm seed && pnpm dev
pnpm dev   # фронт в другом терминале — vite проксит /api на :3000
```

## Хранилище — любой S3

`server/src/storage.ts` работает с любым S3 через env:

| | Cloudflare R2 (прод) | rustfs/MinIO (свой сервер) |
|---|---|---|
| `S3_ENDPOINT` | `https://<account>.r2.cloudflarestorage.com` | `http://localhost:9000` |
| `S3_PUBLIC_BASE_URL` | публичный домен бакета | — |
| `S3_PUBLIC_ENDPOINT` | — | домен, доступный браузеру |
| `S3_FORCE_PATH_STYLE` | `false` | `true` |

С `S3_PUBLIC_BASE_URL` ссылки — обычные `<домен>/<key>`, их кэширует CDN.
Без неё api подписывает URL на `S3_PUBLIC_ENDPOINT` (он должен быть доступен браузеру).
Локальное хранилище поднимается отдельно: `docker run -d -p 9000:9000 -v wntn-s3:/data rustfs/rustfs /data`.

## Деплой на VPS

1. `DOMAIN=твой.домен`, `COOKIE_SECURE=true` и блок R2 (`S3_*`) в `.env`
2. `docker compose up -d --build` (Caddy сам возьмёт TLS)
3. Первый раз: `docker compose run --rm api pnpm db:push && docker compose run --rm api pnpm seed`

## Добавить треки

- **UI:** `/studio` → профиль артиста → создать трек → залить mp3 (версию) и обложку (летят в S3).
- **Пачкой:** mp3 в `public/audio/<артист>/` → `python generate-songs-ts.py` → `docker compose run --rm api pnpm seed`.

## Структура

```
src/            фронт (компоненты, hooks, lib/api.ts)
server/src/     API (routes/, db/schema.ts, storage.ts, auth.ts)
public/         обложки, track-list.json (mp3 уходят в S3)
docker-compose.yml · Caddyfile · Dockerfile.web · server/Dockerfile
PLAN.md         полный план и статус
```
