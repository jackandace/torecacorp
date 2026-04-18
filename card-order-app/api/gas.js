const GAS_URL = "https://script.google.com/macros/s/AKfycbxY_7wUeM24udv12hKtIUayXXWHmNLTtWKfwnabKZZNRoHkFVutCgpulWjq1duTLU0fUA/exec";

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }

  try {
    if (req.method === "GET") {
      const params = new URLSearchParams(req.query);
      const response = await fetch(`${GAS_URL}?${params.toString()}`);
      const data = await response.json();
      res.status(200).json(data);
    } else if (req.method === "POST") {
      const response = await fetch(GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body),
      });
      const data = await response.json();
      res.status(200).json(data);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
