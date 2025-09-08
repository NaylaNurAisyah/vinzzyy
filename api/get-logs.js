import mongoose from "mongoose";

let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectMongo() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }).then(m => m);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

const LogSchema = new mongoose.Schema({
  ip: String,
  city: String,
  region: String,
  country: String,
  latitude: Number,
  longitude: Number,
  org: String,
  time: Date,
});

const Log = mongoose.models.Log || mongoose.model("Log", LogSchema);

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    await connectMongo();
    const logs = await Log.find().sort({ time: -1 });
    res.status(200).json(logs);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}
