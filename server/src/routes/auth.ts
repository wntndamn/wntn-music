import { Hono } from "hono";
import { z } from "zod";
import { eq, or, sql } from "drizzle-orm";
import { db } from "../db";
import { users, artists } from "../db/schema";
import {
  hashPassword,
  verifyPassword,
  createSession,
  destroySession,
  currentUser,
  isAdminRole,
} from "../auth";
import { env } from "../env";
import { newId, slugify, type AppEnv } from "../types";

export const authRoutes = new Hono<AppEnv>();

const signupSchema = z.object({
  username: z
    .string()
    .min(2)
    .max(32)
    .regex(/^[a-zA-Z0-9_.]+$/, "только буквы, цифры, _ и ."),
  email: z.string().email(),
  password: z.string().min(6).max(200),
});

authRoutes.post("/signup", async (c) => {
  const body = signupSchema.safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: "invalid input" }, 400);
  const { username, email, password } = body.data;
  const lower = username.toLowerCase();

  const taken = await db
    .select({ id: users.id })
    .from(users)
    .where(
      or(sql`lower(${users.username}) = ${lower}`, sql`lower(${users.email}) = ${email.toLowerCase()}`),
    )
    .limit(1);
  if (taken.length) return c.json({ error: "ник или почта заняты" }, 409);

  // Username must not impersonate an artist (by slug or name). The real artist
  // gets the name back through the claim flow, not by racing for the username.
  const artistClash = await db
    .select({ id: artists.id })
    .from(artists)
    .where(or(eq(artists.slug, slugify(username)), sql`lower(${artists.name}) = ${lower}`))
    .limit(1);
  if (artistClash.length)
    return c.json({ error: "это имя артиста — запросите доступ на его странице" }, 409);

  const id = newId();
  await db.insert(users).values({
    id,
    username,
    email,
    passwordHash: hashPassword(password),
    displayName: username,
    // env-listed usernames become root right at signup (fresh DB bootstrap)
    role: env.adminUsernames.includes(lower) ? "root" : "user",
  });
  await createSession(c, id);
  return c.json({ id, username });
});

const loginSchema = z.object({ login: z.string(), password: z.string() });

authRoutes.post("/login", async (c) => {
  const body = loginSchema.safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: "invalid input" }, 400);
  const { login, password } = body.data;

  const found = await db
    .select()
    .from(users)
    .where(or(eq(users.username, login), eq(users.email, login)))
    .limit(1);
  const user = found[0];
  if (!user || !verifyPassword(password, user.passwordHash))
    return c.json({ error: "bad credentials" }, 401);
  if (user.bannedAt) return c.json({ error: "аккаунт заблокирован" }, 403);

  await createSession(c, user.id);
  return c.json({ id: user.id, username: user.username });
});

authRoutes.post("/logout", async (c) => {
  await destroySession(c);
  return c.json({ ok: true });
});

authRoutes.get("/me", async (c) => {
  const me = await currentUser(c);
  if (!me || me.bannedAt) return c.json({ user: null });
  const found = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      avatar: users.avatar,
      role: users.role,
      playbackSync: users.playbackSync,
    })
    .from(users)
    .where(eq(users.id, me.id))
    .limit(1);
  if (!found[0]) return c.json({ user: null });
  return c.json({
    user: { ...found[0], isAdmin: isAdminRole(found[0].role), isRoot: found[0].role === "root" },
  });
});
