# Build context = repo root (see docker-compose). Runs TypeScript via tsx, no build step.
FROM node:22-alpine
RUN corepack enable
WORKDIR /app/server

COPY server/package.json ./
RUN pnpm install --no-frozen-lockfile

COPY server/ ./
# seed.ts reads ../public/track-list.json
COPY public/track-list.json /app/public/track-list.json

ENV NODE_ENV=production
EXPOSE 3000
CMD ["pnpm", "start"]
