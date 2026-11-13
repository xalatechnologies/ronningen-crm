import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import { describe, expect, it, vi } from "vitest";

const source = readFileSync(join(process.cwd(), "public/sw.js"), "utf8");

type Handler = (event: Record<string, unknown>) => void;

/** Runs public/sw.js against a fake worker scope so its caching rules can be asserted. */
function load(fetchImpl: (req: unknown) => Promise<unknown>) {
  const handlers: Record<string, Handler> = {};
  const store = new Map<string, Map<string, unknown>>();
  const puts: string[] = [];
  const caches = {
    open: async (name: string) => {
      if (!store.has(name)) store.set(name, new Map());
      const entries = store.get(name)!;
      return {
        addAll: async (urls: string[]) => urls.forEach((u) => entries.set(u, { cached: u })),
        put: async (u: string) => void puts.push(u),
      };
    },
    keys: async () => [...store.keys()],
    delete: vi.fn(async (name: string) => store.delete(name)),
    match: async (url: string) => [...store.values()].map((c) => c.get(url)).find(Boolean),
  };
  const self = {
    addEventListener: (type: string, fn: Handler) => void (handlers[type] = fn),
    skipWaiting: vi.fn(async () => {}),
    clients: { claim: vi.fn(async () => {}) },
  };
  vm.runInNewContext(source, { self, caches, fetch: fetchImpl });
  return { handlers, store, puts, caches, self };
}

const run = (handler: Handler, extra: Record<string, unknown> = {}) => {
  let waited: Promise<unknown> = Promise.resolve();
  let responded: Promise<unknown> | undefined;
  handler({ ...extra, waitUntil: (p: Promise<unknown>) => (waited = p), respondWith: (p: Promise<unknown>) => (responded = p) });
  return { waited, responded };
};

describe("public/sw.js", () => {
  it("precaches only the offline page and one icon", async () => {
    const w = load(async () => ({}));
    await run(w.handlers.install).waited;
    expect([...w.store.get("em-offline-v1")!.keys()]).toEqual(["/offline.html", "/icons/icon-192.png"]);
    expect(w.self.skipWaiting).toHaveBeenCalled();
  });

  it("drops older caches and takes control on activate", async () => {
    const w = load(async () => ({}));
    w.store.set("em-offline-v0", new Map());
    await run(w.handlers.install).waited;
    await run(w.handlers.activate).waited;
    expect(w.caches.delete).toHaveBeenCalledWith("em-offline-v0");
    expect(w.store.has("em-offline-v0")).toBe(false);
    expect(w.self.clients.claim).toHaveBeenCalled();
  });

  it("leaves every non-navigation request to the network", () => {
    const w = load(async () => ({}));
    for (const mode of ["cors", "no-cors", "same-origin"]) expect(run(w.handlers.fetch, { request: { mode } }).responded).toBeUndefined();
  });

  it("passes navigations through and shows the offline page only when the network fails", async () => {
    const online = load(async () => "network page");
    expect(await run(online.handlers.fetch, { request: { mode: "navigate" } }).responded).toBe("network page");

    const offline = load(async () => Promise.reject(new Error("offline")));
    await run(offline.handlers.install).waited;
    expect(await run(offline.handlers.fetch, { request: { mode: "navigate" } }).responded).toEqual({ cached: "/offline.html" });
  });

  it("never stores a page or response: no cache writes and no private paths in the file", async () => {
    const w = load(async () => "private page");
    await run(w.handlers.install).waited;
    await run(w.handlers.fetch, { request: { mode: "navigate" } }).responded;
    expect(w.puts).toEqual([]);
    const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(code).not.toMatch(/\.put\(|\/portal|\/app|\/api|\/auth|\/admin|\/i\//);
  });
});
