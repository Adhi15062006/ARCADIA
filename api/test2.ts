export default async function handler(req: any, res: any) {
  try {
    await import("jsonwebtoken");
    return res.json({ success: true, package: "jsonwebtoken" });
  } catch (err: any) {
    return res.json({ success: false, error: err.message, stack: err.stack });
  }
}
