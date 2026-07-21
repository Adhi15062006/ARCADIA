export default async function handler(req: any, res: any) {
  try {
    await import("firebase-admin");
    return res.json({ success: true, package: "firebase-admin" });
  } catch (err: any) {
    return res.json({ success: false, error: err.message, stack: err.stack });
  }
}
