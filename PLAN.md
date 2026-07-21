# wntn.music — план

Полная система: юзеры, артисты (профили), альбомы, плейлисты, треки с **версиями**
(демо/релиз/...), тексты (синхро/без). Хостинг: **свой VPS + Docker**.

> Это по сути мини-Spotify. Недели работы. План разбит на фазы — **каждая фаза**
> **оставляет сайт рабочим**. Не строй всё разом.

---

## Решения (зафиксированы)

1. **Юзеры регаются** (consumer-auth). Любой юзер может **завести профиль артиста**
   (claim) и стать автором. Артист может быть и без юзера (фит-гость).
2. **Хостинг — VPS, всё в Docker Compose:** Postgres + Redis + API + статика за Caddy.
3. **Файлы в S3-совместимом хранилище** (generic: endpoint + path-style). Локально —
   **rustfs** (docker), в проде — R2/MinIO/AWS, переключается одними env. Аплоад **напрямую из браузера**
   по presigned URL — mp3 не гоняем через API.
4. **Версионирование треков:** у трека несколько версий (демо/релиз/ремастер/лайв),
   у каждой свой файл; одна `is_primary`.

---

## Стек

| Слой | Выбор | Зачем |
|------|-------|-------|
| Фронт | Vite + React + TS + Tailwind (уже есть) | — |
| API | **Node + Hono** + Drizzle | лёгкий, ваш стек TS, не раст |
| БД | **Postgres 16** + Drizzle (миграции + типы) | 9 связанных таблиц |
| Кэш/сессии | **Redis 7** | сессии, rate-limit, кэш stats, буфер плеев |
| Файлы | **S3-совместимое** (`@aws-sdk/client-s3`, presigned) — rustfs локально, R2/MinIO/AWS в проде | один код, любой бэкенд; аудио через `/api/audio/:vid` (302 presigned GET) |
| Пароли | **argon2** (на Node работает нативно) | стандарт |
| Прокси/TLS | **Caddy** | авто-HTTPS, отдаёт статику + проксит `/api` |

**Redis по ролям:** session id → user (TTL); rate-limit на login/upload;
кэш `GET /api/stats`; `INCR` плеев в Redis, периодический флаш в Postgres
(не дёргаем БД на каждый плей).

---

## Дизайн (из реф-сайта `spark` = cobalt.tools / lunaria)

Перенимаем их дизайн-язык. Это React+Tailwind, реф на Svelte — адаптируем токены
в Tailwind theme.

**Шрифты** (вместо Hauora, ставим через `@fontsource`):
- **IBM Plex Sans** — весь UI (основной), `font-weight: 500` по умолчанию.
- **IBM Plex Mono** — длинные тексты, тексты песен, технические подписи.
- **Unbounded** — акцентные заголовки/лого (декор).
- Фишка: `-webkit-font-smoothing: none` на Unbounded/Mono → пиксельно-чёткие.
- Иконки: **@tabler/icons-react** (у реф — Tabler).

**Цвета** (CSS-переменные → Tailwind, тёмная/светлая через `[data-theme]`):
- Нейтраль-первая: primary/secondary = чёрный/белый, инверсия в dark.
- Акцент: **красный `#ed2236`** (под наш `wntn`), + green/blue/purple/orange/gold для статусов.
- Кнопки: фон `--button #f4f4f4`/dark `#191919`, тонкая обводка `rgba(0,0,0,0.06)`,
  `box-shadow: inset 0 0 0 1px`. Hover/press — на тон темнее.
- Скелетоны: шиммер-градиент.

**Геометрия / вайб:**
- `--border-radius: 18px`, `--padding: 12px`.
- Сайдбар 80px (десктоп) → нижний таб-бар (мобила, `safe-area-inset`).
- `overflow: hidden`, скрытые скроллбары, `user-select: none` — ощущение нативного приложения.
- Заголовки: `font-weight 500`, `letter-spacing: -1px` на h1/h2.
- Тонкие бордеры `rgba(...,0.03–0.05)`, мягкие переходы `.16s ease`.

> Итог: чистый нейтральный минимал, скруглённый, app-like, красный акцент,
> IBM Plex + Unbounded. Сделаю Tailwind-конфиг с этими токенами в Фазе 0.

---

## Модель данных (Postgres)

```
users          id, username, email, password_hash, display_name, avatar, created_at
sessions       -> в Redis (id -> user_id, TTL), не таблица
artists        id, user_id?, slug, name, bio, avatar, header_image
albums         id, artist_id, title, cover, year, type(album|ep|single)
tracks         id, title, artist_id, album_id?, cover, duration, plays, created_at,
               primary_version_id?
track_versions id, track_id, kind(demo|release|remaster|live|other),
               label, audio_key(R2), created_at, is_primary
track_artists  track_id, artist_id            -- фиты (M2M)
lyrics         track_id, content, is_synced   -- LRC если synced, иначе plain
playlists      id, user_id, title, cover, is_public, created_at
playlist_tracks playlist_id, track_id, position
likes          (user_id, track_id) PK
follows        (user_id, artist_id) PK         -- опц., фаза 5
```

- Файл на уровне **версии**; обложка/текст — на треке.
- `tracks.id` = sha256 как в питон-скрипте → бесшовный сид.
- Claim: правка артиста/треков разрешена если `artists.user_id == session.user`.

---

## API (Hono)

```
GET  /api/tracks  ?artist= ?album=
GET  /api/tracks/:id            трек + версии + артисты + текст
GET  /api/artists/:slug
GET  /api/albums/:id
GET  /api/playlists/:id
POST /api/play/:trackId         INCR в Redis
GET  /api/stats                 кэш Redis

POST /api/auth/signup | login | logout      GET /api/me

GET    /api/me/library                        [сессия]
POST   /api/likes/:trackId
POST   /api/playlists | PUT /:id
POST   /api/playlists/:id/tracks | DELETE .../:trackId

POST /api/artists               claim       [сессия]
PUT  /api/artists/:slug                      [владелец]
POST /api/albums
POST /api/tracks
POST /api/tracks/:id/versions   -> presigned R2 PUT, потом запись версии
PUT  /api/tracks/:id/lyrics     LRC | plain
```

---

## Docker

Структура репо: фронт в корне, бэк в `server/`.

### `docker-compose.yml`
```yaml
services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: wntn
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-wntn}
      POSTGRES_DB: wntn
    volumes:
      - db-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U wntn -d wntn"]
      interval: 5s
      timeout: 5s
      retries: 10

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: ["redis-server", "--save", "60", "1"]
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 10

  api:
    build:
      context: .
      dockerfile: server/Dockerfile
    restart: unless-stopped
    depends_on:
      db: { condition: service_healthy }
      redis: { condition: service_healthy }
    environment:
      DATABASE_URL: postgres://wntn:${POSTGRES_PASSWORD:-wntn}@db:5432/wntn
      REDIS_URL: redis://redis:6379
      SESSION_SECRET: ${SESSION_SECRET:?set-a-long-random-secret}
      R2_ACCOUNT_ID: ${R2_ACCOUNT_ID}
      R2_ACCESS_KEY_ID: ${R2_ACCESS_KEY_ID}
      R2_SECRET_ACCESS_KEY: ${R2_SECRET_ACCESS_KEY}
      R2_BUCKET: ${R2_BUCKET:-wntn-audio}
      R2_PUBLIC_URL: ${R2_PUBLIC_URL}
      WEB_ORIGIN: ${WEB_ORIGIN:-http://localhost}
      PORT: 3000
    expose: ["3000"]

  web:
    build:
      context: .
      dockerfile: Dockerfile.web   # vite build -> Caddy + reverse_proxy /api
    restart: unless-stopped
    depends_on: [api]
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - caddy-data:/data

volumes:
  db-data:
  redis-data:
  caddy-data:
```

### `server/Dockerfile` (API, Node)
```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
COPY server/package.json server/
RUN pnpm install --frozen-lockfile
COPY server ./server
COPY drizzle ./drizzle
RUN pnpm --filter ./server build        # tsc/esbuild -> server/dist

FROM node:22-alpine AS runtime
WORKDIR /app
RUN corepack enable
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/server/dist ./dist
COPY --from=build /app/server/package.json ./
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### `Dockerfile.web` (Vite -> Caddy)
```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build                          # vite build -> dist

FROM caddy:2-alpine
COPY --from=build /app/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile
```

### `Caddyfile`
```
{$DOMAIN:localhost} {
    handle /api/* {
        reverse_proxy api:3000
    }
    handle {
        root * /srv
        try_files {path} /index.html
        file_server
    }
}
```
Caddy сам берёт TLS-сертификат по `DOMAIN`. Локально — `localhost`, на проде —
свой домен. `.env` рядом с compose: `POSTGRES_PASSWORD`, `SESSION_SECRET`,
`R2_*`, `DOMAIN`, `WEB_ORIGIN`.

Деплой на VPS: `git pull && docker compose up -d --build`. Миграции Drizzle —
энтрипоинтом `api` или отдельным `docker compose run api pnpm db:migrate`.

---

## Версии трека (UX)

Селектор версий на странице трека и в плеере; по умолчанию `is_primary`.
В studio артист грузит версию: `kind` + файл → R2, ставит основной.

## Тексты: синхро и без

- **Plain** — скролл у плеера.
- **Синхро (LRC `[mm:ss.xx]`)** — подсветка строки по `currentTime` + автоскролл.
- Ввод LRC/текста в studio. Tap-to-time редактор — фаза 5.

---

## Фазы (каждая = рабочий сайт)

**Ф0 — Новый фронт + дизайн-система.** Чиню сборку, Tailwind-токены (цвета/радиусы),
шрифты IBM Plex + Unbounded, Tabler-иконки, новые компоненты. Треки из `track-list.json`.
**Ф1 — Инфра + бэк-чтение + миграция.** docker-compose (pg+redis+api+caddy),
Drizzle-схема, сид: mp3 → R2, метаданные → Postgres. Публичные GET. Фронт читает API.
**Ф2 — Юзеры.** signup/login (argon2 + Redis-сессии), лайки, плейлисты, `/library`.
**Ф3 — Тексты.** схема + ручки + панель (synced/plain), заливка LRC.
**Ф4 — Studio.** claim-артист, профиль, альбомы, аплоад версий в R2.
**Ф5 (опц.) — Соц + редактор синхро.** подписки, комменты, tap-to-time LRC.

---

## Что НЕ строить сейчас (YAGNI)

- OAuth/соцлогины, рекомендации, умный поиск — нет нужды.
- Очереди (BullMQ), k8s, отдельный nginx — Caddy + Redis покрывают.
- Транскодинг/битрейты — отдаём mp3 как есть.
- Кластер Postgres, реплики — один контейнер с volume + бэкап `pg_dump` по крону.

---

## Статус (автопилот)

**Главная v2 + богатые альбомы/плейлисты (спотифай-метаданные) ГОТОВО, 12/12 live-ассертов (2026-07-21).**
- Схема: albums + `cover_key/release_date/description/genres[]`; playlists + `cover_key/description`;
  tracks + `genres[]/explicit`; artists + `genres[]`. Накатано db:push.
- `GET /api/home` — артисты (по числу треков, с аватарками), все альбомы (с артистом), свежие
  публичные плейлисты. Главная: секции «артисты» (кружки), «альбомы» (карточки с типом/годом),
  «плейлисты», «треки» (грид с фильтром-чипсами).
- Страница альбома `/album/:id` (новая): шапка (обложка, тип · год, артист, дата релиза, жанры-чипсы,
  описание, «слушать»), нумерованный треклист с бейджем E (explicit), плеями, play по ховеру.
- Обложки альбомов и плейлистов: аплоад в студии/редакторе плейлиста → S3 → `GET /api/cover/album/:id`
  и `/api/cover/playlist/:id` (302 presigned). Роут `/api/cover/:trackId` остался.
- Студия: редактор альбома как у трека (панель «управление»: обложка, название, тип-Select,
  дата релиза, жанры через запятую, описание); у трека в «о треке» — жанры + галка explicit;
  у артиста в профиле — жанры. Плейлист: описание + обложка в панели редактирования.
- Артист: чипсы жанров в шапке + горизонтальная лента альбомов.
- Проверено вживую: 12 ассертов (home, rich-поля альбома, обложки альбома/плейлиста 200,
  жанры/explicit трека и в треклисте альбома, жанры артиста, 403 на чужой плейлист).
  Главная проверена в браузере, консоль чистая. Тестовые данные вычищены.


**Аватарки + кастомный UI-кит (сайдбар/модалки/селект) ГОТОВО, 8/8 live-ассертов (2026-07-21).**
- Аватарки: у юзера (`POST /api/me/avatar`, кнопка на своей странице `/u/:username`) и у артиста
  (`POST /api/manage/artists/:id/avatar`, в студии → профиль). Хранятся в S3 (`avatars/…`,
  колонки `avatar_key`), отдаются через `GET /api/avatar/{user|artist}/:id` → 302 presigned.
  Показываются: шапка (кружок → свой профиль), страница юзера, страница артиста, студия.
  Общий парсер `server/src/upload.ts` (jpg/png/webp). Проверено: 8 ассертов (аплоад, отдача,
  400 на не-картинку, 403 на чужого артиста).
- Ничего стандартного: `Dialogs.tsx` (DialogProvider, promise-based confirm/prompt — модалки
  с оверлеем вместо window.confirm/prompt, Esc/клик-мимо = отмена), `Select.tsx` (кастомный
  дропдаун вместо `<select>`), `SideNav.tsx` (вертикальный сайдбар на десктопе, горизонтальная
  лента на мобиле) — заменил `Tabs.tsx` (удалён) в студии, админке и панели трека.
- Все ссылки на трек открываются в новой вкладке (`target=_blank`): карточки, плейлист,
  популярные у артиста, студия.


**UI-подгруппы в редактировании (спотифай-структура) ГОТОВО (2026-07-21).**
- Общий компонент `Tabs` (пилюли как в админке) — один вид табов везде.
- Студия: верхние табы «треки · N / альбомы · N / профиль»; панель трека — подгруппы
  «о треке» (название, альбом, обложка) / «версии · N» (список+заливка) / «текст» (SyncEditor).
- Плейлист: спотифай-шапка (обложка из первого трека, бейдж публичный/приватный, «слушать»),
  у владельца кнопка «редактировать» → панель с подгруппами «о плейлисте» (название,
  приватность) и «опасная зона» (удаление → редирект в библиотеку). Нумерованные строки треков.
- Артист: секции «популярные» (топ-5 по прослушиваниям, скрыта пока plays=0) и «все треки».
  `Track.plays` прокинут из `/api/tracks`.
- lint+build зелёные, web пересобран, страница артиста проверена в браузере (0 ошибок консоли).

**Управление треками (студия v2) ГОТОВО, 15/15 live-ассертов (2026-07-21).**
- Бэк (`manage.ts`): PUT/DELETE трека (переименование, привязка к альбому `albumId: null` —
  отвязка; удаление сносит версии+лирику каскадом и файлы из S3), версии: set-primary
  (перевешивает флаги и `tracks.primary_version_id`), PUT kind/label, DELETE (при удалении
  основной — промоутится другая, файл удаляется из S3). Альбомы: PUT (title/year/type) и
  DELETE (треки остаются, FK set null). Все manage/album-ручки: владелец **или админ**.
  `storage.ts`: + `deleteObject` (best-effort), мёртвый `presignPut` удалён.
- Студия v2: у трека — обложка-превью, ссылка на страницу, раскрывающаяся панель
  «управление»: переименование, селект альбома, список версий (основная ⭐, сделать
  основной, удалить), заливка аудио (первая версия автоматически primary), обложка, текст
  (SyncEditor), удаление трека с конфирмом. Альбомы: переименование (prompt) и удаление.
- Проверено вживую: 15 ассертов (загрузка 2 версий multipart, primary-логика, label,
  промоушен при удалении primary, rename, альбомы, 403 для чужака, каскад+S3-удаление).

**Роли/баны/админка v2 + genius-лирика ГОТОВО, 21/21 live-ассертов (2026-07-21).**
- Роли в БД: `users.role` (user/admin/root) + `users.banned_at`. `ADMIN_USERNAMES` (env) теперь
  только бутстрап root'ов (на старте api и при signup). Root выдаёт/снимает админку на `/admin`
  (вкладка «юзеры»), админ банит юзеров (ранги: root > admin > user, себя/равных нельзя),
  бан рубит сессию и логин. «Снять доступ» к артисту — вкладка «артисты» (артист снова claimable).
- Signup: ник нельзя взять именем/slug'ом существующего артиста (409 → иди через claim),
  формат ника `[a-zA-Z0-9_.]`.
- Genius-лирика: любой залогиненный предлагает текст/LRC на странице трека (`lyrics_edits`,
  pending), владелец артиста или админ видит очередь прямо на треке и принимает/отклоняет;
  правки владельца/админа применяются сразу. Дубль-pending от одного юзера → 409.
- Плейлисты: приватность при создании, удаление (владелец или админ). Комменты: админ удаляет любые.
- Публичные профили `/u/:username` (displayName, дата, публичные плейлисты, артист юзера).
- Проверено вживую смоук-скриптом через Caddy: 21 passed, 0 failed. Тестовые данные вычищены.


**Фикс загрузки (CORS) — uploads через API (2026-06-23).**
Браузерный presigned PUT напрямую в S3 (`localhost:9000`) падал на CORS (другой origin +
AWS SDK checksum-заголовки, rustfs без CORS-конфига). Решение: загрузка версий/обложек идёт
**через API** (`POST /api/manage/.../versions|cover`, multipart, same-origin → без CORS, ключи
S3 не светятся в браузере), сервер кладёт в S3 через `putObject` (bodyLimit 60МБ, allowlist
audio/* и image jpeg/png/webp). Воспроизведение остаётся presigned-GET (audio/img грузятся
cross-origin без CORS). Проверено вживую: multipart upload аудио+обложки, байты совпали,
не-аудио → 400. `presignPut` больше не нужен.

**Владение артистами + модерация (claim/admin) ГОТОВО И ПРОВЕРЕНО (2026-06-23).**
Забрать существующего (seeded, `userId=null`) артиста: на его странице кнопка «это я —
запросить доступ» → `claim_requests` (pending). Админ (username в env `ADMIN_USERNAMES`)
на `/admin` видит очередь, одобряет → `artists.userId` = заявителю, конкурирующие заявки
авто-reject; занятый артист больше не claimable (защита от перехвата). `isAdmin` в `/auth/me`,
`requireAdmin` middleware, один владелец-артист на юзера. Проверено 12 ассертов: pending не даёт
доступа, non-admin 403, approve передаёт владение + чистит очередь, eve блокируется (409).
Чтобы стать владельцем: впиши свой username в `ADMIN_USERNAMES` (.env) → `docker compose up -d api`
→ зарегайся этим именем → запроси доступ на /artist/<slug> → одобри на /admin.

**Ф5 (соц + редактор синхро) ГОТОВА И ПРОВЕРЕНА ВЖИВУЮ (2026-06-23).**
- Подписки на артистов: `follows`-таблица, `/api/me/follows/:id` toggle, на странице артиста
  кнопка «подписаться · N» + счётчик + isFollowing, «подписки» в библиотеке. Проверено (count +1).
- Комментарии: таблица `comments`, `/api/comments/:trackId` (список/добавить/удалить свой),
  секция на странице трека с автором и удалением своих. Проверено (CRUD).
- Tap-to-time LRC-редактор (`SyncEditor`): вставляешь текст → играешь трек → тапаешь каждую
  строку в такт → генерится LRC → сохраняется. В студии вместо простого ввода текста.
- Всё зелёное: server tsc · фронт lint+build (227 КБ) · live-тест через Caddy · браузер без ошибок.
- Тестовые данные из smoke-тестов вычищены, каталог = 51 трек (все с аудио).

**ПОЛНЫЙ `docker compose up` СТЕК ПОДНЯТ И ПРОВЕРЕН В БРАУЗЕРЕ (2026-06-23).**
5 контейнеров (db/redis/s3-rustfs/api/web-Caddy) одной командой. db:push + seed внутри
контейнера (api↔s3 по `http://s3:9000`, 51 mp3 в S3). Через Caddy на http://localhost:
SPA + `/api` (51 трек), аудио играет в реальном браузере (`readyState=4`, duration=43s,
`error=null`) по пути Caddy→api→302→rustfs. Консоль без ошибок. split-horizon S3 решён
(`S3_ENDPOINT` internal vs `S3_PUBLIC_ENDPOINT` для presigned URL). Локально Caddy на HTTP
(`DOMAIN=http://localhost`) чтобы аудио не было mixed-content; на VPS — домен → авто-HTTPS.
Pnpm запинен на 10.17.1 (иначе новый pnpm в контейнере фатально падает на ignored esbuild build).
README с запуском/деплоем готов.

**Новые фичи доведены и проверены вживую:** переключатель версий + тексты из БД (LRC karaoke)
на странице трека, счётчик прослушиваний (пинг при старте, 0→1, max с Redis-буфером), загрузка
обложек в S3 (`/api/cover/:id` → 302, байты совпали), правка профиля артиста, создание альбомов.

**Хранилище: S3-совместимое, проверено вживую на rustfs.**
Слой `server/src/storage.ts` (generic S3: endpoint + path-style) заменил R2-привязку.
Аудио отдаётся через `GET /api/audio/:versionId` → 302 на presigned GET (любой S3, без
публичных бакетов). Seed заливает существующие mp3 в S3 (`ensureBucket` + putObject).
Локально rustfs в docker (`s3` сервис, порт 9000). Проверено end-to-end: seed→rustfs (51 файл),
плеер тянет аудио из rustfs (302→200 audio/mpeg), studio-аплоад (presigned PUT→байты совпали).
Переключение на R2/MinIO/AWS — одними env (`S3_ENDPOINT`, `S3_FORCE_PATH_STYLE=false` для R2).

**Фронт целиком (Ф0 + UI всех фич): ГОТОВО, сборка зелёная.**
Добавлено поверх Ф0: вход/регистрация (`AuthPage`), auth-контекст (`useAuth`,
кука-сессия), лайки (`LikeButton` на карточке и странице трека), библиотека
(`Library`: лайки + плейлисты + создание), плейлисты (`PlaylistPage`,
`AddToPlaylist`), студия артиста (`Studio`: claim, создание треков, загрузка
версий прямо в R2 по presigned URL, редактор текстов LRC/plain). API-клиент
`src/lib/api.ts` покрывает все эндпоинты (credentials: include). Шапка показывает
вход / студию+библиотеку+выход. Бэк дополнен `GET /api/me/artist`.
Всё ждёт только живую БД — фронт компилируется и линтится чисто.

**Ф0 — фронт + дизайн-система: ГОТОВО, сборка зелёная.**
- `pnpm build` ✅ (IBM Plex Sans/Mono + Unbounded через @fontsource, Tabler-иконки)
- Дизайн-токены cobalt-стиля в `tailwind.config.js` + `src/index.css` (тёмная/светлая, radius 18px, красный акцент)
- Компоненты: `App` (хедер+тема+роуты), `Home` (грид+фильтр по артисту), `TrackCard`,
  `TrackGrid`, `ArtistPage`, `TrackPage`, `LyricsPanel` (LRC синхро + plain), `Player`
  (нижний бар: play/pause/seek/volume/next/prev), `ErrorBoundary`
- Состояние плеера — `hooks/usePlayer.tsx`; загрузка треков — `hooks/useTracks.ts`
- LRC-парсер `src/lib/lyrics.ts` + runnable-проверка `scripts/check-lyrics.ts` ✅
- Чинит сломанную сборку (старый `main.tsx` импортил удалённое)

**Ф1–Ф4 — бэкенд: код готов, `tsc --noEmit` зелёный. Runtime НЕ прогонялся**
(на машине не запущен Docker-демон → Postgres/Redis поднять не удалось).
- `server/` — Hono + Drizzle(Postgres) + ioredis + R2 presign, пароли на `node:crypto scrypt`
- Схема всех таблиц `server/src/db/schema.ts`; роуты: auth, tracks(+play), artists(claim/edit),
  albums, playlists, me(library/likes), manage(create track / version→R2 / lyrics)
- `server/src/seed.ts` — импорт `track-list.json` → artists/tracks/versions (идемпотентно)
- Docker: `docker-compose.yml` (db+redis+api+web/Caddy), `server/Dockerfile`, `Dockerfile.web`,
  `Caddyfile`, `.env.example`. `docker compose config` валиден.

### Что осталось проверить вживую (нужен Docker)
```bash
cp .env.example .env          # впиши SESSION_SECRET, POSTGRES_PASSWORD
docker compose up -d --build  # поднимет всё; web на http://localhost
# первый раз — схема и сид:
docker compose run --rm api pnpm db:push
docker compose run --rm api pnpm seed
```
Фронт уже связан с API: `useTracks` → `loadTracks()` ходит в `GET /api/tracks`,
при недоступности падает на `track-list.json` (сайт жив в обоих случаях). Vite
dev-прокси `/api` → `:3000` (см. `vite.config.ts`); в проде проксит Caddy.
`/api/tracks` отдаёт `song` (URL основной версии); без R2 — локальный путь
`/audio/...`, который уже отдаёт статика. Осталось ТОЛЬКО прогнать вживую на Docker.

### Локальная разработка без Docker
```bash
pnpm dev                      # фронт на :5173 (читает public/track-list.json)
cd server && pnpm dev         # API на :3000 (нужны локальные Postgres+Redis и .env)
```

> ⚠️ При коммите: новые компоненты в PascalCase (`Player.tsx`), а git ещё помнит старый
> `player.tsx` (Windows case-insensitive). Перед коммитом `git rm --cached
> src/components/player.tsx src/components/library.tsx src/components/SEO.tsx` и заново
> `git add`, иначе на Linux-сборке regресс по регистру.
