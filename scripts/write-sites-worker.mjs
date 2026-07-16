import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const serverDir = join(process.cwd(), "dist", "server");
await mkdir(serverDir, { recursive: true });

const workerSource = `const INDEX_PATH = "/index.html";

function wantsHtmlFallback(request) {
  if (request.method !== "GET") return false;
  const accept = request.headers.get("accept") || "";
  if (!accept.includes("text/html")) return false;
  const pathname = new URL(request.url).pathname;
  return !pathname.split("/").pop()?.includes(".");
}

async function fetchAsset(env, request) {
  if (!env?.ASSETS?.fetch) {
    return new Response("AstroBone static asset binding is unavailable.", {
      status: 500,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
  return env.ASSETS.fetch(request);
}

export default {
  async fetch(request, env) {
    const response = await fetchAsset(env, request);
    if (response.status !== 404 || !wantsHtmlFallback(request)) {
      return response;
    }

    const url = new URL(request.url);
    const fallback = new Request(new URL(INDEX_PATH, url), request);
    return fetchAsset(env, fallback);
  },
};
`;

await writeFile(join(serverDir, "index.js"), workerSource, "utf8");
