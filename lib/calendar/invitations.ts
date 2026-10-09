import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { backendConfig } from "./config";

export function invitationToken(id: string) {
  if (!/^[a-f0-9]{32}$/.test(id)) throw new Error("Invalid invitation ID.");
  const signature = createHmac("sha256", backendConfig().secret)
    .update(`yes-calendar-invite-v1:${id}`).digest("base64url");
  return `${id}.${signature}`;
}
export function readInvitationToken(token: string | null) {
  if (!token || !/^[a-f0-9]{32}\.[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const id = token.split(".")[0];
  const expected = Buffer.from(invitationToken(id));
  return timingSafeEqual(expected, Buffer.from(token)) ? id : null;
}
