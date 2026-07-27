import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const BACKUP_DIR = path.join(DATA_DIR, 'backups', `pre_cleanup_${Date.now()}`);

function backupDataFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    console.log(`[Backup] Data directory not found at: ${DATA_DIR}`);
    return;
  }

  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const files = fs.readdirSync(DATA_DIR);

  for (const file of files) {
    if (file.endsWith('.json')) {
      const srcPath = path.join(DATA_DIR, file);
      const destPath = path.join(BACKUP_DIR, file);
      fs.copyFileSync(srcPath, destPath);
    }
  }
  console.log(`[Backup] Successfully backed up all JSON data files to: ${BACKUP_DIR}`);
}

function cleanTestOrders() {
  const ordersPath = path.join(DATA_DIR, 'orders.json');
  if (!fs.existsSync(ordersPath)) {
    console.log('[Clean Orders] orders.json does not exist.');
    return;
  }

  const rawOrders = fs.readFileSync(ordersPath, 'utf8');
  let orders: any[] = [];
  try {
    orders = JSON.parse(rawOrders);
  } catch (e) {
    console.error('[Clean Orders] Failed to parse orders.json:', e);
    return;
  }

  const initialCount = orders.length;

  // Criteria for identifying test/mock orders
  const cleanedOrders = orders.filter((order) => {
    const isTestFlag = order.isTest === true;
    const isTestEmail = typeof order.email === 'string' && (
      order.email.toLowerCase().includes('test@') || 
      order.email.toLowerCase().includes('example.com') ||
      order.email.toLowerCase().includes('dummy')
    );
    const hasMockPaymentLink = Array.isArray(order.milestones) && order.milestones.some((m: any) =>
      typeof m.paymentLink === 'string' && m.paymentLink.includes('mock_arcadia')
    );
    const isNegativePrice = typeof order.price === 'number' && order.price < 0;

    const isTestOrder = isTestFlag || isTestEmail || isNegativePrice;
    
    if (isTestOrder) {
      console.log(`[Clean Orders] Flagged test order for removal: ID=${order.id}, Email=${order.email}, Name=${order.name}`);
    }
    return !isTestOrder;
  });

  fs.writeFileSync(ordersPath, JSON.stringify(cleanedOrders, null, 2));
  console.log(`[Clean Orders] Processed ${initialCount} orders -> ${cleanedOrders.length} valid orders remaining. (${initialCount - cleanedOrders.length} test orders purged)`);
}

function cleanMockEmails() {
  const mockEmailsPath = path.join(DATA_DIR, 'mock_emails.json');
  if (!fs.existsSync(mockEmailsPath)) {
    console.log('[Clean Mock Emails] mock_emails.json does not exist.');
    return;
  }

  fs.writeFileSync(mockEmailsPath, JSON.stringify([], null, 2));
  console.log('[Clean Mock Emails] Purged mock_emails.json successfully.');
}

function runCleanup() {
  console.log('================================================================');
  console.log('           ARCADIA DATABASE TEST DATA PURGE UTILITY             ');
  console.log('================================================================');
  backupDataFiles();
  cleanTestOrders();
  cleanMockEmails();
  console.log('================================================================');
  console.log('                     CLEANUP COMPLETED                          ');
  console.log('================================================================');
}

runCleanup();
