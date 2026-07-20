/**
 * Server-side request context utility.
 *
 * Reads the current Web Request from TanStack Start's AsyncLocalStorage
 * (the same storage used internally by createServerFn).  This replaces
 * the old `globalThis.__request` pattern which was never populated.
 *
 * Strategy: try the start-storage context first (used by server functions),
 * fall back to the event-storage H3 event (used by SSR request handler).
 */
import { AsyncLocalStorage } from "node:async_hooks";

const START_STORAGE_KEY = Symbol.for("tanstack-start:start-storage-context");
const EVENT_STORAGE_KEY = Symbol.for("tanstack-start:event-storage");

function getFromStorage(
  key: symbol,
  path: string[],
): Request | null {
  const storage = (globalThis as any)[key] as
    | AsyncLocalStorage<any>
    | undefined;
  if (!storage) return null;

  const ctx = storage.getStore();
  if (!ctx) return null;

  // Walk the path inside the context object
  let value: any = ctx;
  for (const segment of path) {
    value = value?.[segment];
    if (value == null) return null;
  }
  return value instanceof Request ? value : null;
}

export function getServerRequest(): Request | null {
  // 1. Try start-storage: ctx.request  (server functions)
  const req = getFromStorage(START_STORAGE_KEY, ["request"]);
  if (req) return req;

  // 2. Fall back to event-storage: ctx.h3Event.node.req → IncomingMessage
  //    H3Event wraps the web Request — use .node.req and rebuild a web Request from it.
  const eventStorage = (globalThis as any)[EVENT_STORAGE_KEY] as
    | AsyncLocalStorage<any>
    | undefined;
  if (!eventStorage) return null;

  const eventCtx = eventStorage.getStore();
  if (!eventCtx) return null;

  const h3Event: any = eventCtx.h3Event;
  if (!h3Event) return null;

  // Try to get the web Request from the H3 event (h3 stores it as .node.req or .web?.request)
  const webReq: Request | undefined =
    h3Event.node?.req || // Node IncomingMessage (not a web Request)
    h3Event.web?.request; // Web Request (newer h3 versions)

  if (webReq instanceof Request) return webReq;

  // If we have a Node IncomingMessage, build headers from it and construct a synthetic Request
  const nodeReq = h3Event.node?.req;
  if (nodeReq && typeof nodeReq.url === "string") {
    // Build a minimal web Request from the Node IncomingMessage so headers.get() works
    const headers = new Headers();
    if (nodeReq.headers) {
      for (const [k, v] of Object.entries(nodeReq.headers)) {
        if (typeof v === "string") headers.set(k, v);
        else if (Array.isArray(v)) v.forEach((vv) => headers.append(k, vv));
      }
    }
    const url = `http://${headers.get("host") || "localhost"}${nodeReq.url}`;
    return new Request(url, { method: nodeReq.method || "GET", headers });
  }

  return null;
}
