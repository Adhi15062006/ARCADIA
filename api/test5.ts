export default async function handler(req: any, res: any) {
  try {
    await import("firebase/app");
    return res.json({ success: true, package: "firebase/app" });
  } catch (err: any) {
    return res.json({ success: false, error: err.message, stack: err.stack });
  }
}
