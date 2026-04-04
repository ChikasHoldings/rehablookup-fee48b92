import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, "../public");

const projectUrl = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "https://plckxokpyiubuekvodtc.supabase.co").replace(/\/$/, "");
const sitemapFunctionUrl = `${projectUrl}/functions/v1/sitemap-facilities`;

const targets = [
  { type: "main", fileName: "sitemap.xml" },
  { type: "facilities", fileName: "sitemap-facilities.xml" },
  { type: "index", fileName: "sitemap-index.xml" },
];

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function fetchSitemap(type) {
  const response = await fetch(`${sitemapFunctionUrl}?type=${encodeURIComponent(type)}`, {
    headers: {
      Accept: "application/xml,text/xml;q=0.9,*/*;q=0.1",
      "User-Agent": "RehabLookup Sitemap Builder/1.0",
    },
  });

  const body = await response.text();

  if (!response.ok) {
    throw new Error(`Failed to fetch ${type} sitemap (${response.status}): ${body.slice(0, 200)}`);
  }

  if (!body.trim().startsWith("<?xml")) {
    throw new Error(`Expected XML for ${type} sitemap but received: ${body.slice(0, 120)}`);
  }

  return body;
}

async function generateSitemapFile({ type, fileName }) {
  const filePath = path.join(publicDir, fileName);

  try {
    const xml = await fetchSitemap(type);
    await writeFile(filePath, xml, "utf8");
    console.log(`[sitemap] generated ${fileName}`);
  } catch (error) {
    if (await fileExists(filePath)) {
      console.warn(`[sitemap] failed to refresh ${fileName}; keeping existing file.`, error);
      return;
    }

    throw error;
  }
}

await mkdir(publicDir, { recursive: true });

for (const target of targets) {
  await generateSitemapFile(target);
}
