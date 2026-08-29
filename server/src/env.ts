function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`missing env var: ${name}`);
  return v;
}

export const env = {
  databaseUrl: req("DATABASE_URL"),
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  sessionSecret: req("SESSION_SECRET"),
  port: Number(process.env.PORT ?? 3000),
  // comma-separated: the site is served from several domains in prod
  webOrigins: (process.env.WEB_ORIGIN ?? "http://localhost")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  cookieSecure: process.env.COOKIE_SECURE !== "false",
  // comma-separated usernames with moderation rights
  adminUsernames: (process.env.ADMIN_USERNAMES ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
  // Generic S3-compatible storage. Works with rustfs/MinIO (path-style) or R2/AWS.
  s3: {
    endpoint: process.env.S3_ENDPOINT ?? "http://localhost:9000",
    // Endpoint baked into presigned URLs (must be browser-reachable). In full
    // docker the api talks to s3 at http://s3:9000 but the browser needs
    // http://localhost:9000 (or a domain). Defaults to S3_ENDPOINT.
    publicEndpoint:
      process.env.S3_PUBLIC_ENDPOINT ?? process.env.S3_ENDPOINT ?? "http://localhost:9000",
    // Public bucket base URL (R2 custom domain). When set, GET URLs are plain
    // ${base}/${key} instead of presigned — the CDN can then cache them.
    publicBaseUrl: process.env.S3_PUBLIC_BASE_URL?.replace(/\/+$/, ""),
    region: process.env.S3_REGION ?? "us-east-1",
    // no fallbacks: a prod deploy that forgets these must fail loudly rather
    // than run on credentials published in this repo
    accessKeyId: req("S3_ACCESS_KEY_ID"),
    secretAccessKey: req("S3_SECRET_ACCESS_KEY"),
    bucket: process.env.S3_BUCKET ?? "wntn-audio",
    // rustfs/MinIO need path-style; set S3_FORCE_PATH_STYLE=false for R2/AWS.
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== "false",
  },
};
