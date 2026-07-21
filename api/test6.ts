export default async function handler(req: any, res: any) {
  try {
    await import("firebase/firestore");
    return res.json({ success: true, package: "firebase/firestore" });
  } catch (err: any) {
    return res.json({ success: false, error: err.message, stack: err.stack });
  }
}
