import { test } from "node:test";
import assert from "node:assert/strict";
import handler from "../api/proxy.js";

test("Vercel proxy preserves queries, selects Radar credentials and handles errors", async () => {
  const originalFetch = globalThis.fetch;
  const keys = ["API_PROXY_TARGET", "API_USERNAME", "API_PASSWORD", "RADAR_API_PROXY_TARGET", "RADAR_API_USERNAME", "RADAR_API_PASSWORD"];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  const response = () => ({
    headers: {},
    setHeader(key, value) { this.headers[key] = value; },
    status(code) { this.code = code; return this; },
    json(body) { this.body = body; return this; },
    send(body) { this.body = body; return this; },
  });
  try {
    Object.assign(process.env, { API_PROXY_TARGET: "https://primary.example", API_USERNAME: "test", API_PASSWORD: "test-password", RADAR_API_PROXY_TARGET: "https://radar.example", RADAR_API_USERNAME: "", RADAR_API_PASSWORD: "" });
    const calls = [];
    globalThis.fetch = async (url, options) => {
      calls.push({ url: url.href, options });
      return new Response('{"content":[]}', { headers: { "content-type": "application/json" } });
    };
    const map = response();
    await handler({ method: "GET", url: "/api/proxy?__path=mapa&path=mapa&page=1&sort=id%2Casc" }, map);
    assert.equal(calls[0].url, "https://primary.example/api/mapa?page=1&sort=id%2Casc");
    assert.equal(calls[0].options.headers.Authorization, `Basic ${Buffer.from("test:test-password").toString("base64")}`);
    assert.equal(map.code, 200);
    assert.equal(map.headers["Cache-Control"], "no-store");
    await handler({ method: "GET", url: "/api/proxy?__path=radar/resumo" }, response());
    assert.equal(calls[1].url, "https://radar.example/api/radar/resumo");
    const denied = response();
    await handler({ method: "POST", url: "/api/proxy?__path=mapa" }, denied);
    assert.equal(denied.code, 405);
    const traversal = response();
    await handler({ method: "GET", url: "/api/proxy?__path=../health" }, traversal);
    assert.equal(traversal.code, 400);
    assert.equal(calls.length, 2);
    globalThis.fetch = async () => new Response("Unauthorized", { status: 401 });
    const unauthorized = response();
    await handler({ method: "GET", url: "/api/proxy?__path=mapa" }, unauthorized);
    assert.equal(unauthorized.code, 401);
    assert.equal(unauthorized.body.toString(), "Unauthorized");
    globalThis.fetch = async () => { const error = new Error(); error.name = "TimeoutError"; throw error; };
    const timeout = response();
    await handler({ method: "GET", url: "/api/proxy?__path=mapa" }, timeout);
    assert.equal(timeout.code, 504);
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});
