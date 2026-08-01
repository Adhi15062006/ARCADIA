import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

dotenv.config();

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyCRsDYK1bAoCSaMEk8NE-eidvD6qt6Tvi8",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "arcadia-developers.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "arcadia-developers",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "arcadia-developers.firebasestorage.app",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "122899421269",
  appId: process.env.FIREBASE_APP_ID || "1:122899421269:web:c392ff7ae9346773f81cdc"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const DATA_DIR = path.join(process.cwd(), 'data');
const SERVER_KEY = 'arcadia_secure_server_key_2026_futuristic_studio_token';

async function seedCollection(collectionName: string, fileName: string) {
  const filePath = path.join(DATA_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    console.log(`[Seed] File ${fileName} not found. Skipping ${collectionName}.`);
    return;
  }

  const rawData = fs.readFileSync(filePath, 'utf8');
  let items: any[] = [];
  try {
    items = JSON.parse(rawData);
  } catch (err) {
    console.error(`[Seed] Error parsing ${fileName}:`, err);
    return;
  }

  if (!Array.isArray(items) || items.length === 0) {
    console.log(`[Seed] Collection ${collectionName} has 0 items to seed.`);
    return;
  }

  console.log(`[Seed] Seeding ${items.length} items into collection '${collectionName}' via Client SDK...`);
  let successCount = 0;
  for (const item of items) {
    if (!item) continue;
    const docId = String(item.id || item.code || item.uid || item.orderId || item.bookingId || ("doc_" + Math.random().toString(36).substr(2, 9)));
    
    // Add server key to bypass rules check
    const payload = {
      ...item,
      id: docId,
      server_key: SERVER_KEY
    };

    try {
      await setDoc(doc(db, collectionName, docId), payload, { merge: true });
      successCount++;
    } catch (err: any) {
      console.error(`[Seed Error] Failed to write ${collectionName}/${docId}:`, err.message || err);
    }
  }
  console.log(`[Seed] Successfully seeded ${successCount}/${items.length} items into '${collectionName}'.`);
}

async function main() {
  console.log('================================================================');
  console.log('       ARCADIA DATA MIGRATION: CLIENT SDK SEED TO FIRESTORE     ');
  console.log('================================================================');

  const adminEmail = process.env.ADMIN_EMAIL || "arcadiadevelopers07@gmail.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "findme@arcadia1509";
  
  console.log(`[Seed] Authenticating as Admin: ${adminEmail}...`);
  try {
    await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
    console.log("[Seed] Successfully authenticated as Admin with Firebase Auth!");
  } catch (authErr: any) {
    console.log(`[Seed] Auth failed (${authErr.message || authErr}). Attempting to register admin user ${adminEmail} directly...`);
    try {
      const { createUserWithEmailAndPassword } = await import('firebase/auth');
      await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
      console.log(`[Seed] Successfully created and authenticated admin user ${adminEmail}!`);
    } catch (createErr: any) {
      console.error(`[Seed Error] Could not create admin user in Firebase Auth:`, createErr.message || createErr);
    }
  }

  const mappings = [
    { collection: 'users', file: 'users.json' },
    { collection: 'orders', file: 'orders.json' },
    { collection: 'projects', file: 'projects.json' },
    { collection: 'payments', file: 'payments.json' },
    { collection: 'services', file: 'services.json' },
    { collection: 'blogs', file: 'blogs.json' },
    { collection: 'testimonials', file: 'testimonials.json' },
    { collection: 'faqs', file: 'faqs.json' },
    { collection: 'careers', file: 'vacancies.json' },
    { collection: 'roles', file: 'roles.json' },
    { collection: 'permissions', file: 'permissions.json' },
    { collection: 'websiteSettings', file: 'homepage_settings.json' }
  ];

  for (const map of mappings) {
    await seedCollection(map.collection, map.file);
  }

  console.log('================================================================');
  console.log('          FIRESTORE CLIENT SEEDING COMPLETED                    ');
  console.log('================================================================');
}

main().catch(console.error);
