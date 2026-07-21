export default async function handler(req, res) {
  const steps = [];
  try {
    steps.push("1. express");
    const p1 = "express";
    await import(p1);
    
    steps.push("2. jsonwebtoken");
    const p2 = "jsonwebtoken";
    await import(p2);
    
    steps.push("3. bcryptjs");
    const p3 = "bcryptjs";
    await import(p3);
    
    steps.push("4. razorpay");
    const p4 = "razorpay";
    await import(p4);
    
    steps.push("5. firebase/app");
    const p5 = "firebase/app";
    await import(p5);
    
    steps.push("6. firebase/firestore");
    const p6 = "firebase/firestore";
    await import(p6);
    
    steps.push("7. firebase-admin");
    const p7 = "firebase-admin";
    await import(p7);
    
    return res.json({ success: true, steps });
  } catch (err) {
    return res.json({ success: false, steps, error: err.message, stack: err.stack });
  }
}
