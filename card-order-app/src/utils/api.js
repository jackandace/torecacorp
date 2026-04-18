// Vercelプロキシ経由でGASを呼び出す（CORSエラー回避）
const PROXY_URL = "/api/gas";
export const API_SECRET = "palette369secret";

export async function apiGet(action, params = {}) {
  const url = new URL(PROXY_URL, window.location.origin);
  url.searchParams.set("action", action);
  url.searchParams.set("secret", API_SECRET);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

export async function apiPost(action, body = {}) {
  const res = await fetch(PROXY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, secret: API_SECRET, ...body }),
  });
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}
