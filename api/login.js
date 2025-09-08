import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import crypto from "crypto";

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);
const JWT_SECRET = process.env.JWT_SECRET || "jwtsecret1239451923ur9ajwiaiwjamanpokoknYAmah";

async function sendOTP(email, otp) {
  // SMTP transporter (pakai Gmail/Resend/SendGrid sesuai preferensi)
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER, // email pengirim
      pass: process.env.EMAIL_PASS  // password/aplikasi key
    }
  });

  await transporter.sendMail({
    from: `"Vinzzyy Verification" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Kode Verifikasi Akun",
    text: `Kode OTP kamu adalah: ${otp}`,
    html: `<h2>Kode OTP kamu: <b>${otp}</b></h2>`
  });
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    await client.connect();
    const db = client.db("Database_Vinzzyy");
    const users = db.collection("UserData");

    if (req.method === "POST") {
      const { action, email, username, password, otp } = req.body;

      // REGISTER
      if (action === "register") {
        if (!email || !username || !password) {
          return res.status(400).json({ error: "Data tidak lengkap" });
        }

        const exist = await users.findOne({ email });
        if (exist) return res.status(409).json({ error: "Email sudah terdaftar" });

        const hashed = await bcrypt.hash(password, 10);
        const otpCode = crypto.randomInt(100000, 999999).toString();

        await users.insertOne({
          username,
          email,
          password: hashed,
          isVerified: false,
          otp: otpCode,
          otpExpires: new Date(Date.now() + 15 * 60 * 1000) // 15 menit
        });

        await sendOTP(email, otpCode);

        return res.status(200).json({ message: "Register berhasil, cek email untuk verifikasi" });
      }

      // VERIFY OTP
      if (action === "verify") {
        if (!email || !otp) return res.status(400).json({ error: "Email & OTP wajib" });

        const user = await users.findOne({ email });
        if (!user) return res.status(404).json({ error: "User tidak ditemukan" });
        if (user.isVerified) return res.status(400).json({ error: "Akun sudah diverifikasi" });

        if (user.otp !== otp || new Date() > user.otpExpires) {
          return res.status(400).json({ error: "OTP salah atau expired" });
        }

        await users.updateOne({ email }, { $set: { isVerified: true }, $unset: { otp: "", otpExpires: "" } });

        return res.status(200).json({ message: "Verifikasi berhasil, silakan login" });
      }

      // LOGIN
      if (action === "login") {
        if (!email || !password) return res.status(400).json({ error: "Email & password wajib" });

        const user = await users.findOne({ email });
        if (!user) return res.status(404).json({ error: "User tidak ditemukan" });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ error: "Password salah" });
        if (!user.isVerified) return res.status(403).json({ error: "Akun belum diverifikasi" });

        const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: "1h" });

        return res.status(200).json({ message: "Login berhasil", token });
      }

      return res.status(400).json({ error: "Action tidak dikenali" });
    }

    return res.status(405).json({ error: "Method tidak diizinkan" });
  } catch (err) {
    console.error("❌ Error API login.js:", err);
    return res.status(500).json({ error: "Server error", detail: err.message });
  } finally {
    await client.close();
  }
}
