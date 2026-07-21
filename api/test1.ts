export default async function handler(req: any, res: any) {
  try {
    await import("express");
    return res.json({ success: true, package: "express" });
  } catch (err: any) {
    return res.json({ success: false, error: err.message, stack: err.stack });
  }
}
