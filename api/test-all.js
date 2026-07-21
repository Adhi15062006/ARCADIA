export default async function handler(req, res) {
  const steps = [];
  try {
    steps.push("1. express");
    const express = await import("express");
    
    steps.push("2. jsonwebtoken");
    await import("jsonwebtoken");
    
    steps.push("3. bcryptjs");
    await import("bcryptjs");
    
    steps.push("4. razorpay");
    await import("razorpay");
    
    steps.push("5. firebase/app");
    await import("firebase/app");
    
    steps.push("6. firebase/firestore");
    await import("firebase/firestore");
    
    steps.push("7. firebase-admin");
    await import("firebase-admin");
    
    return res.json({ success: true, steps });
  } catch (err) {
    return res.json({ success: false, steps, error: err.message, stack: err.stack });
  }
}
