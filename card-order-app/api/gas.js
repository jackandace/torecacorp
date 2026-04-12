export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const GAS_URL = "https://script.google.com/macros/s/AKfycbyaPDonzM9PGUoL7Sw7YqHnitYJS4nOa6NPeD6e_CX7G2jFtN8PcTsAnaoGlQLZesWc0g/exec";

  try {
    let response;

    if (req.method === "GET") {
      const qs = new URLSearchParams(req.query).toString();
      response = await fetch(`${GAS_URL}?${qs}`, {
        method: "GET",
        redirect: "follow",
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Accept": "application/json"
        }
      });
    } else {
      response = await fetch(GAS_URL, {
        method: "POST",
        redirect: "follow",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0",
          "Accept": "application/json"
        },
        body: JSON.stringify(req.body)
      });
    }

    const text = await response.text();
    res.setHeader("Content-Type", "application/json");
    return res.status(200).send(text);

  } catch (err) {
    console.error("Proxy error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
