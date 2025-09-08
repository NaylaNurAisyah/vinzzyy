import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);
const dbName = 'Database_Vinzzyy';

export default async function handler(req, res) {
  // Tambah header CORS untuk semua jenis request
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (!process.env.MONGODB_URI) {
      console.error("❗ MONGO_URI tidak ditemukan!");
      throw new Error("Missing MONGO_URI");
    }

    await client.connect();
    console.log("✅ MongoDB berhasil connect");

    const db = client.db(dbName);
    const collection = db.collection("users");

    if (req.method === "GET") {
      const users = await collection.find().toArray();
      return res.status(200).json(users);
    }

    if (req.method === "POST") {
      const buffers = [];
      for await (const chunk of req) buffers.push(chunk);
      const body = JSON.parse(Buffer.concat(buffers).toString());
      const { username } = body;
    
      if (!username) return res.status(400).json({ error: "Username required" });

      const exists = await collection.findOne({ name: { $regex: `^${username}$`, $options: "i" } });
      if (exists) {
        return res.status(409).json({ error: "User already exists" });
      }
      
      const robloxRes = await fetch("https://users.roblox.com/v1/usernames/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usernames: [username], excludeBannedUsers: true })
      });
    
      const robloxData = await robloxRes.json();
      const userData = robloxData.data?.[0];
      if (!userData || !userData.id) {
        return res.status(404).json({ error: "Username not found on Roblox" });
      }
    
      const { id, name, displayName } = userData;
    
      await collection.insertOne({ id, name });
      return res.status(200).json({ message: `${name} (${id}) added` });
    }

    if (req.method === "DELETE") {
      const { username } = req.query;
      if (!username) return res.status(400).json({ error: "Username required" });
    
      const result = await collection.deleteOne({ name: { $regex: `^${username}$`, $options: "i" } });
    
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "Username tidak ditemukan" });
      }
    
      return res.status(200).json({ message: `Username ${username} telah dihapus` });
    }




    return res.status(405).json({ error: "Method not allowed" });

  } catch (err) {
    console.error("🔥 ERROR di handler:", err);
    return res.status(500).json({
      error: "Internal Server Error",
      details: err.message
    });
  }
}
