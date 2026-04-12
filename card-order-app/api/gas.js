export const config = {
  api: { bodyParser: true }
};

const GAS_URL = "https://script.google.com/macros/s/AKfycbyaPDonzM9PGUoL7Sw7YqHnitYJS4nOa6NPeD6e_CX7G2jFtN8PcTsAnaoGlQLZesWc0g/exec";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    let gasRes;

    if (req.method === "GET") {
      const qs = Object.entries(req.query)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join("&");
      gasRes = await fetch(`${GAS_URL}?${qs}`, {
        method: "GET",
        redirect: "follow",
        headers: { "User-Agent": "node-fetch" }
      });
    } else {
      gasRes = await fetch(GAS_URL, {
        method: "POST",
        redirect: "follow",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "node-fetch"
        },
        body: JSON.stringify(req.body)
      });
    }

    const text = await gasRes.text();
    
    try {
      const json = JSON.parse(text);
      return res.status(200).json(json);
    } catch {
      return res.status(200).send(text);
    }

  } catch (err) {
    console.error("GAS proxy error:", err);
    return res.status(500).json({ 
      error: err.message,
      cause: err.cause?.message || null
    });
  }
}
