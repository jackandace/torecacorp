export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const GAS_URL = "https://script.google.com/macros/s/AKfycbyaPDonzM9PGUoL7Sw7YqHnitYJS4nOa6NPeD6e_CX7G2jFtN8PcTsAnaoGlQLZesWc0g/exec";

  try {
    let url = GAS_URL;
    let options = { method: req.method, redirect: "follow" };

    if (req.method === "GET") {
      const qs = new URLSearchParams(req.query).toString();
      url = `${GAS_URL}?${qs}`;
    } else {
      options.headers = { "Content-Type": "application/json" };
      options.body = JSON.stringify(req.body);
    }

    const gasRes = await fetch(url, options);
    const text = await gasRes.text();
    res.status(200).send(text);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
