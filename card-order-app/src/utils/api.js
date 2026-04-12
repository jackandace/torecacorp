// GAS WebApp URL
export const API_SECRET = "palette369secret";

export async function apiGet(action, params = {}) {
  const url = new URL("/api/gas", window.location.origin);
  url.searchParams.set("action", action);
  url.searchParams.set("secret", API_SECRET);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
}

export async function apiPost(action, data = {}) {
  const res = await fetch("/api/gas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, secret: API_SECRET, ...data }),
  });
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
}
