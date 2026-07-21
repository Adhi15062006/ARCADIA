/**
 * Firestore Project-to-Project Migration Utility Script
 * 
 * This script migrates all collections, documents, and subcollections recursively from 
 * a source Firebase project to a destination Firebase project.
 * 
 * Usage:
 *   1. Place your service account credentials in the root directory:
 *      - source-service-account.json
 *      - destination-service-account.json
 *   2. Run command:
 *      node migrate-firestore.js [options]
 * 
 * Options:
 *   --overwrite  Overwrite documents if they already exist in the destination database.
 *   --dry-run    Preview the migration process without writing or modifying any data.
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

// --- CONFIGURATION ---
const SOURCE_KEY_PATH = path.join(__dirname, 'source-service-account.json');
const DEST_KEY_PATH = path.join(__dirname, 'destination-service-account.json');

// Source Database ID (AI Studio Custom Database ID)
const SOURCE_DATABASE_ID = 'ai-studio-arcadiaaisolutio-e008a71b-35b9-498f-a5b4-12308399d8ea';
// Destination Database ID (usually '(default)' for standard new Firebase projects)
const DEST_DATABASE_ID = '(default)';

// Parse Command Line Flags
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const overwriteEnabled = args.includes('--overwrite');

// Statistics trackers
const stats = {
  collectionsMigrated: new Set(),
  docsCopied: 0,
  docsSkipped: 0,
  docsFailed: 0,
  errorsList: []
};

// 1. Validation checks
if (!fs.existsSync(SOURCE_KEY_PATH)) {
  console.error(`Error: Source service account credentials file not found at: ${SOURCE_KEY_PATH}`);
  process.exit(1);
}

if (!fs.existsSync(DEST_KEY_PATH)) {
  console.error(`Error: Destination service account credentials file not found at: ${DEST_KEY_PATH}`);
  process.exit(1);
}

console.log('================================================================');
console.log('         FIRESTORE DATABASE RECUSIVE MIGRATION UTILITY          ');
console.log('================================================================');
console.log(`Source Project Database:      ${SOURCE_DATABASE_ID}`);
console.log(`Destination Project Database: ${DEST_DATABASE_ID}`);
console.log(`Dry Run Mode:                 ${isDryRun ? 'ENABLED (Read-Only)' : 'DISABLED (Writes Active)'}`);
console.log(`Overwrite Existing:           ${overwriteEnabled ? 'ENABLED (Will replace matches)' : 'DISABLED (Will skip duplicates)'}`);
console.log('================================================================\n');

// 2. Initialize App Instances
let sourceApp, destApp;
try {
  const sourceAccount = require(SOURCE_KEY_PATH);
  sourceApp = admin.initializeApp({
    credential: admin.credential.cert(sourceAccount),
    projectId: sourceAccount.project_id
  }, 'source');
  console.log(`[Initialize] Connected to Source Project: ${sourceAccount.project_id}`);
} catch (err) {
  console.error('[Initialize] Failed to authenticate with Source Project:', err.message);
  process.exit(1);
}

try {
  const destAccount = require(DEST_KEY_PATH);
  destApp = admin.initializeApp({
    credential: admin.credential.cert(destAccount),
    projectId: destAccount.project_id
  }, 'destination');
  console.log(`[Initialize] Connected to Destination Project: ${destAccount.project_id}\n`);
} catch (err) {
  console.error('[Initialize] Failed to authenticate with Destination Project:', err.message);
  process.exit(1);
}

// 3. Initialize Firestore Instances
const sourceDb = getFirestore(sourceApp, SOURCE_DATABASE_ID);
const destDb = getFirestore(destApp, DEST_DATABASE_ID === '(default)' ? undefined : DEST_DATABASE_ID);

// 4. Migration Helper
async function migrateCollection(collectionRef, destParentDocRef = null) {
  const collectionPath = collectionRef.path;
  stats.collectionsMigrated.add(collectionRef.id);
  console.log(`[Collection] Scanning path: /${collectionPath}`);

  let snapshot;
  try {
    snapshot = await collectionRef.get();
  } catch (err) {
    console.error(`  [Error] Failed to fetch documents in /${collectionPath}:`, err.message);
    stats.errorsList.push({ path: collectionPath, error: err.message });
    return;
  }

  if (snapshot.empty) {
    console.log(`  [Info] Collection is empty.`);
    return;
  }

  console.log(`  [Progress] Found ${snapshot.size} documents in /${collectionPath}`);

  for (const doc of snapshot.docs) {
    const docPath = doc.ref.path;
    const docData = doc.data();

    // Determine the destination reference
    const destDocRef = destParentDocRef
      ? destParentDocRef.collection(collectionRef.id).doc(doc.id)
      : destDb.collection(collectionRef.id).doc(doc.id);

    try {
      // Check if document exists in destination database
      const destDocSnap = await destDocRef.get();
      const docExists = destDocSnap.exists;

      if (docExists && !overwriteEnabled) {
        console.log(`  [Skip] /${docPath} already exists in destination (use --overwrite to force update)`);
        stats.docsSkipped++;
      } else {
        if (isDryRun) {
          console.log(`  [Dry-Run] Would copy /${docPath}`);
          stats.docsCopied++;
        } else {
          // Perform the deep copy
          await destDocRef.set(docData);
          console.log(`  [Copied] /${docPath} -> ${docExists ? 'UPDATED' : 'CREATED'}`);
          stats.docsCopied++;
        }
      }

      // Check and migrate any nested subcollections recursively
      const subcollections = await doc.ref.listCollections();
      for (const subcol of subcollections) {
        await migrateCollection(subcol, destDocRef);
      }

    } catch (err) {
      console.error(`  [Error] Failed to migrate document /${docPath}:`, err.message);
      stats.docsFailed++;
      stats.errorsList.push({ path: docPath, error: err.message });
    }
  }
}

// 5. Main Execution Thread
async function run() {
  try {
    console.log('[Migration] Fetching root-level collections from source Firestore...');
    const rootCollections = await sourceDb.listCollections();

    if (rootCollections.length === 0) {
      console.log('[Migration] No root collections found in source database.');
      return;
    }

    console.log(`[Migration] Discovered ${rootCollections.length} root collections to migrate.\n`);

    for (const collection of rootCollections) {
      await migrateCollection(collection);
    }

    console.log('\n================================================================');
    console.log('                      MIGRATION REPORT                          ');
    console.log('================================================================');
    console.log(`Total Collections Visited: ${stats.collectionsMigrated.size}`);
    console.log(`Collections List:          ${Array.from(stats.collectionsMigrated).join(', ')}`);
    console.log(`Documents Successfully Copied/Simulated: ${stats.docsCopied}`);
    console.log(`Documents Skipped (Exist):               ${stats.docsSkipped}`);
    console.log(`Documents Failed:                        ${stats.docsFailed}`);
    
    if (stats.errorsList.length > 0) {
      console.log('\nErrors Logged:');
      stats.errorsList.forEach((item, index) => {
        console.log(`  ${index + 1}. Path: /${item.path} - Reason: ${item.error}`);
      });
    } else {
      console.log('\nMigration completed successfully without any errors.');
    }
    console.log('================================================================');

  } catch (err) {
    console.error('Fatal Migration Error:', err.message);
  } finally {
    // Terminate apps to release listeners
    await Promise.all([sourceApp.delete(), destApp.delete()]);
  }
}

run();
