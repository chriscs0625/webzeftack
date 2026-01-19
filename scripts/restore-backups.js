#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('='.repeat(60));
console.log('   RESTORE BACKUPS SCRIPT');
console.log('='.repeat(60));
console.log('');

let restoredCount = 0;
let errorCount = 0;

function scanForBackups(dir) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Skip node_modules and .git
        if (!['node_modules', '.git', 'scripts'].includes(entry.name)) {
          scanForBackups(fullPath);
        }
      } else if (entry.name.endsWith('.backup')) {
        // Restore this backup
        const originalPath = fullPath.replace('.backup', '');
        
        try {
          fs.copyFileSync(fullPath, originalPath);
          fs.unlinkSync(fullPath);
          console.log(`✅ Restored: ${originalPath}`);
          restoredCount++;
        } catch (error) {
          console.error(`❌ Error restoring ${fullPath}:`, error.message);
          errorCount++;
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning ${dir}:`, error.message);
  }
}

// Start scanning from current directory
scanForBackups(process.cwd());

console.log('');
console.log('='.repeat(60));
console.log(`Restored: ${restoredCount} files`);
console.log(`Errors: ${errorCount}`);
console.log('='.repeat(60));
