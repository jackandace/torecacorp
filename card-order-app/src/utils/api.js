// GAS WebApp URL
export const GAS_URL = "https://script.google.com/macros/s/AKfycbxY_7wUeM24udv12hKtIUayXXWHmNLTtWKfwnabKZZNRoHkFVutCgpulWjq1duTLU0fUA/exec";
export const API_SECRET = "palette369secret";

export async function apiGet(action, params = {}) {
  const url = new URL(GAS_URL);
  url.searchParams.set("action", action);
  url.searchParams.set("secret", API_SECRET);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
}

export async function apiPost(action, data = {}) {
  const res = await fetch(GAS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, secret: API_SECRET, ...data }),
  });
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
}
