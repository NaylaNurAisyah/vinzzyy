import { connectToDatabase } from "../../lib/mongodb";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { db } = await connectToDatabase();
    const user = await db.collection("users").findOne({ email: decoded.email });

    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: Admin only" });
    }

    // kalau sampai sini, berarti admin beneran
    res.json({ message: "Halo Admin, semua data rahasia ada di sini" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
}
