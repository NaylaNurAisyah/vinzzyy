import { MongoClient } from "mongodb";
import jwt from "jsonwebtoken";

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);
const JWT_SECRET = process.env.JWT_SECRET;

export default async function handler(req, res) {
  try {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") return res.status(200).end();

    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token" });

    const decoded = jwt.verify(token, JWT_SECRET);

    await client.connect();
    const db = client.db("Database_Vinzzyy");
    const users = db.collection("UserData");

    const user = await users.findOne({ email: decoded.email });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role !== "admin") return res.status(403).json({ message: "Forbidden" });

    return res.json({ message: "Hello Admin!", email: user.email });
  } catch (err) {
    console.error("API /admin error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  } finally {
    await client.close();
  }
}
