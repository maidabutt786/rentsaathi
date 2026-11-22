import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

import { AIClient, AIRequestError } from "../src/aiClient.js";

function startServer(handler) {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

const silentLogger = { warn() {}, info() {}, error() {} };

test("retries 5xx responses and succeeds", async () => {
  let attempts = 0;
  let seenKey = null;
  const server = await startServer((req, res) => {
    attempts += 1;
    seenKey = req.headers["x-api-key"];
    if (attempts < 3) {
      res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ detail: "boom" }));
      return;
    }
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ fraudScore: 12, fraudLabel: "verified" }));
  });
  const { port } = server.address();

  const client = new AIClient({
    baseUrl: `http://127.0.0.1:${port}`,
    apiKey: "secret-key",
    maxRetries: 3,
    logger: silentLogger,
  });
  const result = await client.analyzeListing({ listingId: "l1", imageUrls: [], metadata: {} });

  assert.equal(result.fraudScore, 12);
  assert.equal(attempts, 3);
  assert.equal(seenKey, "secret-key");
  server.close();
});

test("does not retry 4xx responses", async () => {
  let attempts = 0;
  const server = await startServer((req, res) => {
    attempts += 1;
    res.writeHead(401, { "content-type": "application/json" });
    res.end(JSON.stringify({ detail: "bad key" }));
  });
  const { port } = server.address();
  const client = new AIClient({
    baseUrl: `http://127.0.0.1:${port}`,
    apiKey: "wrong",
    maxRetries: 3,
    logger: silentLogger,
  });

  await assert.rejects(
    () => client.analyzeListing({ listingId: "l1", imageUrls: [], metadata: {} }),
    (error) => error instanceof AIRequestError && error.status === 401,
  );
  assert.equal(attempts, 1);
  server.close();
});

test("deleteIndex encodes the listing id and uses DELETE", async () => {
  let method = null;
  let url = null;
  const server = await startServer((req, res) => {
    method = req.method;
    url = req.url;
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ deleted: true, listingId: "a/b" }));
  });
  const { port } = server.address();
  const client = new AIClient({
    baseUrl: `http://127.0.0.1:${port}/`,
    apiKey: "k",
    maxRetries: 0,
    logger: silentLogger,
  });

  const result = await client.deleteIndex("a/b");
  assert.equal(result.deleted, true);
  assert.equal(method, "DELETE");
  assert.equal(url, "/index-listing/a%2Fb");
  server.close();
});
