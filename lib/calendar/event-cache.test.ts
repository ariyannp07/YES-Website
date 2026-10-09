import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createEventCache } from "./event-cache";

const snapshot = { timezone: "America/New_York", events: [] };
describe("short-lived server event cache", () => {
  it("coalesces concurrent loads and expires strictly after 30 seconds", async () => {
    let now = 0;
    const load = vi.fn(async () => snapshot);
    const cached = createEventCache(load, () => now);
    await Promise.all([cached("backend"), cached("backend")]);
    now = 29_999;
    expect(await cached("backend")).toEqual(snapshot);
    expect(load).toHaveBeenCalledTimes(1);
    now = 30_000;
    await cached("backend");
    expect(load).toHaveBeenCalledTimes(2);
    await cached("new-deployment-or-secret");
    expect(load).toHaveBeenCalledTimes(3);
  });
  it("never serves stale events after an upstream failure and retries failures", async () => {
    let now = 0;
    const load = vi.fn().mockResolvedValueOnce(snapshot).mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(snapshot);
    const cached = createEventCache(load, () => now);
    await cached("backend");
    now = 30_000;
    await expect(cached("backend")).rejects.toThrow("offline");
    expect(await cached("backend")).toEqual(snapshot);
    expect(load).toHaveBeenCalledTimes(3);
  });
});
