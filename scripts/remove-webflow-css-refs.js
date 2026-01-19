#!/usr/bin/env node

/**
 * Remove Webflow CSS References
 * 
 * This script removes any remaining references to deleted Webflow CSS files
 */

const fs = require('fs');
const path = require('path');

const BASE_DIR = process.cwd();
let filesModified = 0;

function processHTMLFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Remove references to deleted Webflow CSS (both https and relative paths)
    content = content.replace(
      /<link[^>]*href="(https:\/\/)?cdn\.prod\.website-files\.com\/[^"]*\.css"[^>]*>/gi,
      '<!-- Webflow CSS removed -->'
    );
    
    content = content.replace(
      /<link[^>]*href="assets\/cdn\.prod\.website-files\.com\/[^"]*\.css"[^>]*>/gi,
      '<!-- Webflow CSS removed -->'
    );
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed: ${path.relative(BASE_DIR, filePath)}`);
      filesModified++;
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error: ${filePath}: ${error.message}`);
    return false;
  }
}

function scanDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      if (['node_modules', '.git', 'backup', 'scripts', 'assets'].includes(entry.name)) {
        continue;
      }
      scanDirectory(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      processHTMLFile(fullPath);
    }
  }
}

console.log('Removing Webflow CSS references...\n');
scanDirectory(BASE_DIR);
console.log(`\n✅ Fixed ${filesModified} files`);
