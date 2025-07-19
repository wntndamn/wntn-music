import type { Songs } from "./assets/songs";

export type Song = typeof Songs[0];

export type Nullable<T> = T | null;