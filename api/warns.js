import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);
const dbName = 'Database_Vinzzyy';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*"); 
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    await client.connect();
    const db = client.db(dbName);
    const usersCollection = db.collection('users');
    const warnsCollection = db.collection('warns');

    if (req.method === 'POST') {
      const buffers = [];
      for await (const chunk of req) buffers.push(chunk);
      const body = JSON.parse(Buffer.concat(buffers).toString());
      const { username } = body;

      if (!username) return res.status(400).json({ error: "Username diperlukan" });

      const user = await usersCollection.findOne({ name: { $regex: `^${username}$`, $options: 'i' } });
      if (!user) return res.status(404).json({ error: "Username tidak ditemukan di database" });

      const existingWarn = await warnsCollection.findOne({ userId: user.id });

      if (existingWarn) {
        const updated = await warnsCollection.updateOne(
          { userId: user.id },
          {
            $inc: { count: 1 },
            $set: { warnedAt: new Date() }
          }
        );
        return res.status(200).json({ message: `Warning ke-${existingWarn.count + 1} untuk @${user.name}` });
      } else {
        await warnsCollection.insertOne({
          name: user.name,
          displayName: user.displayName,
          userId: user.id,
          count: 1,
          warnedAt: new Date()
        });
        return res.status(200).json({ message: `User ${user.name} telah diberi warning pertama.` });
      }
    }

    if (req.method === 'GET') {
      const warns = await warnsCollection.find().sort({ warnedAt: -1 }).toArray();
      return res.status(200).json(warns);
    }

    if (req.method === 'DELETE') {
      const username = req.query.username;
      if (!username) return res.status(400).json({ error: "Username diperlukan" });

      const user = await usersCollection.findOne({ name: { $regex: `^${username}$`, $options: 'i' } });
      if (!user) return res.status(404).json({ error: "Username tidak ditemukan" });

      const warn = await warnsCollection.findOne({ userId: user.id });
      if (!warn) return res.status(404).json({ error: "User belum pernah di-warn" });

      if (warn.count > 1) {
        await warnsCollection.updateOne({ userId: user.id }, {
          $inc: { count: -1 },
          $set: { warnedAt: new Date() }
        });
        return res.status(200).json({ message: `1 warning dikurangi dari @${user.name}` });
      } else {
        await warnsCollection.deleteOne({ userId: user.id });
        return res.status(200).json({ message: `Semua warning untuk @${user.name} dihapus.` });
      }
    }

    return res.status(405).json({ error: "Method tidak didukung" });
  } catch (err) {
    console.error("🔥 ERROR:", err);
    return res.status(500).json({ error: "Kesalahan server", detail: err.message });
  }
}
