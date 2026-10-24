import { randomUUID } from "node:crypto";

export const newId = (prefix: string) => `${prefix}_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
