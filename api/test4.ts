export default async function handler(req: any, res: any) {
  try {
    await import("razorpay");
    return res.json({ success: true, package: "razorpay" });
  } catch (err: any) {
    return res.json({ success: false, error: err.message, stack: err.stack });
  }
}
