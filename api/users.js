import { MongoClient } from "mongodb";
import fetch from "node-fetch";

const uri = process.env.MONGODB_URI; // MongoDB Atlas URI
const client = new MongoClient(uri);

export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*"); 
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  try {
    await client.connect();
    const db = client.db("Database_Vinzzyy");
    const collection = db.collection("users");

    if (req.method === "GET") {
      const users = await collection.find({}).toArray();

      // update displayName realtime
      const updatedUsers = await Promise.all(
        users.map(async (user) => {
          try {
            const r = await fetch(`https://users.roblox.com/v1/users/${user.id}`);
            if (r.ok) {
              const data = await r.json();
              if (data.displayName && data.displayName !== user.displayName) {
                // update ke DB kalau beda
                await collection.updateOne(
                  { id: user.id },
                  { $set: { displayName: data.displayName } }
                );
                user.displayName = data.displayName;
              }
            }
          } catch (err) {
            console.error(`Gagal update ${user.id}:`, err);
          }
          return user;
        })
      );

      return res.status(200).json(updatedUsers);
    }

    if (req.method === "POST") {
      const { username } = req.body;
      if (!username) return res.status(400).json({ error: "Username diperlukan" });

      // cek ke Roblox API → ambil id
      const search = await fetch(
        `https://users.roblox.com/v1/usernames/users`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ usernames: [username] }),
        }
      );
      const searchData = await search.json();
      if (!searchData?.data?.length) return res.status(404).json({ error: "Username tidak ditemukan" });

      const { id, name, displayName } = searchData.data[0];

      // cek kalau udah ada
      const exist = await collection.findOne({ id });
      if (exist) return res.status(409).json({ error: "User sudah ada di database" });

      await collection.insertOne({ id, name, displayName });
      return res.status(200).json({ message: "User berhasil ditambahkan" });
    }

    if (req.method === "DELETE") {
      const { username } = req.query;
      if (!username) return res.status(400).json({ error: "Username diperlukan" });

      const result = await collection.deleteOne({ name: username });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "Username tidak ditemukan di database" });
      }

      return res.status(200).json({ message: "User berhasil dihapus" });
    }

    res.status(405).json({ error: "Method tidak diizinkan" });
  } catch (err) {
    console.error("API error:", err);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    await client.close();
  }
}
