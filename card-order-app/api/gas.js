import https from "https";
import http from "http";

const GAS_URL = "https://script.google.com/macros/s/AKfycbyaPDonzM9PGUoL7Sw7YqHnitYJS4nOa6NPeD6e_CX7G2jFtN8PcTsAnaoGlQLZesWc0g/exec";

function followRedirects(url, options, body) {
  return new Promise((resolve, reject) => {
    const makeRequest = (currentUrl) => {
      const lib = currentUrl.startsWith("https") ? https : http;
      const req = lib.request(currentUrl, options, (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
          makeRequest(res.headers.location);
          return;
        }
        let data = "";
        res.on("data", chunk => data += chunk);
        res.on("end", () => resolve({ status: res.statusCode, body: data }));
      });
      req.on("error", reject);
      if (body) req.write(body);
      req.end();
    };
    makeRequest(url);
  });
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    if (req.method === "GET") {
      const params = new URLSearchParams(req.query).toString();
      const result = await followRedirects(`${GAS_URL}?${params}`, { method: "GET" });
      const data = JSON.parse(result.body);
      return res.status(200).json(data);
    }

    if (req.method === "POST") {
      const body = JSON.stringify(req.body);
      const result = await followRedirects(GAS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body)
        }
      }, body);
      const data = JSON.parse(result.body);
      return res.status(200).json(data);
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
