export default async function handler(req: any, res: any) {
  try {
    await import("bcryptjs");
    return res.json({ success: true, package: "bcryptjs" });
  } catch (err: any) {
    return res.json({ success: false, error: err.message, stack: err.stack });
  }
}
