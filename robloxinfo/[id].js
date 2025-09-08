import fetch from "node-fetch";

export default async function handler(req, res) {
  const allowedOrigins = [
    "https://project.vinzzyy.my.id",
    "http://localhost:3000"
  ];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Only GET allowed" });

  const id = req.url.split("/").pop();
  if (!id || isNaN(id)) return res.status(400).json({ error: "Invalid userId" });

  try {
    const resRoblox = await fetch(`https://users.roblox.com/v1/users/${id}`);
    if (!resRoblox.ok) throw new Error("Roblox API error");

    const data = await resRoblox.json();
    return res.status(200).json({ displayName: data.displayName });
  } catch (err) {
    console.error("❌ Roblox fetch error:", err);
    return res.status(500).json({ error: "Gagal ambil displayName", detail: err.message });
  }
}
