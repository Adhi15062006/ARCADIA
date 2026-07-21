import express from "express";

const app = express();

app.get("/api/test-simple", (req, res) => {
  res.json({ success: true, message: "Simple express app works on Vercel!" });
});

app.post("/api/auth/login", (req, res) => {
  res.json({ success: true, message: "Login mock succeeds!" });
});

export default app;
