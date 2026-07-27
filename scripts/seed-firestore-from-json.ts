import fs from 'fs';
import path from 'path';
import { getApps as getAdminApps, initializeApp as initializeAdminApp, cert } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore, Firestore } from 'firebase-admin/firestore';

const DATA_DIR = path.join(process.cwd(), 'data');

// Initialize Firebase Admin SDK if credentials exist or fallback to default app
function getAdminDb(): Firestore {
  if (getAdminApps().length > 0) {
    return getAdminFirestore();
  }

  const saPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(process.cwd(), 'destination-service-account.json');
  
  if (fs.existsSync(saPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(saPath, 'utf8'));
    initializeAdminApp({
      credential: cert(serviceAccount)
    });
    console.log(`[Seed Firestore] Connected via Service Account: ${serviceAccount.project_id}`);
  } else {
    console.log('[Seed Firestore] No service account file found. Attempting default initialization...');
    initializeAdminApp();
  }
  return getAdminFirestore();
}

async function seedCollectionFromJson(db: Firestore, collectionName: string, fileName: string) {
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

  console.log(`[Seed] Seeding ${items.length} items into collection '${collectionName}'...`);
  
  let batch = db.batch();
  let count = 0;

  for (const item of items) {
    const docId = item.id || item.code || item.uid || db.collection(collectionName).doc().id;
    const docRef = db.collection(collectionName).doc(String(docId));
    batch.set(docRef, item, { merge: true });
    count++;

    if (count % 500 === 0) {
      await batch.commit();
      batch = db.batch();
      console.log(`[Seed] Committed batch of 500 items for '${collectionName}'.`);
    }
  }

  if (count % 500 !== 0) {
    await batch.commit();
  }

  console.log(`[Seed] Completed seeding ${count} records into collection '${collectionName}'.`);
}

async function main() {
  console.log('================================================================');
  console.log('       ARCADIA DATA MIGRATION: JSON TO CLOUD FIRESTORE          ');
  console.log('================================================================');

  try {
    const db = getAdminDb();

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
      await seedCollectionFromJson(db, map.collection, map.file);
    }

    console.log('================================================================');
    console.log('          FIRESTORE SEEDING MIGRATION SUCCESSFUL                ');
    console.log('================================================================');
  } catch (err: any) {
    console.error('[Seed Firestore] Migration failed:', err.message || err);
  }
}

main();
