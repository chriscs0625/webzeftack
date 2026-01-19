#!/usr/bin/env node

/**
 * Add Placeholder CSS Link to All HTML Files
 * 
 * This script adds a link to placeholders.css in the <head> section
 * of all HTML files in the website.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const BASE_DIR = process.cwd();
const CSS_LINK = '<link href="assets/css/placeholders.css" rel="stylesheet">';

// Statistics
let stats = {
  filesProcessed: 0,
  filesModified: 0,
  errors: 0
};

/**
 * Process an HTML file and add the CSS link
 */
function processHTMLFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Check if CSS link already exists
    if (content.includes('placeholders.css')) {
      console.log(`  ⏭️  Already has CSS link: ${path.relative(BASE_DIR, filePath)}`);
      return false;
    }
    
    // Calculate the correct relative path based on file location
    const fileDir = path.dirname(filePath);
    const depth = path.relative(BASE_DIR, fileDir).split(path.sep).filter(p => p).length;
    const relativePath = '../'.repeat(depth) + 'assets/css/placeholders.css';
    
    // Add CSS link before closing </head> tag
    const headClosingTag = '</head>';
    if (content.includes(headClosingTag)) {
      const cssLinkTag = `  <link href="${relativePath}" rel="stylesheet">\n${headClosingTag}`;
      content = content.replace(headClosingTag, cssLinkTag);
      
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`  ✅ Added CSS link: ${path.relative(BASE_DIR, filePath)}`);
      return true;
    } else {
      console.log(`  ⚠️  No </head> tag found: ${path.relative(BASE_DIR, filePath)}`);
      return false;
    }
    
  } catch (error) {
    console.error(`  ❌ Error processing ${filePath}: ${error.message}`);
    stats.errors++;
    return false;
  }
}

/**
 * Recursively scan directory for HTML files
 */
function scanDirectory(dir, processFile) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      // Skip certain directories
      if (['node_modules', '.git', 'backup', 'scripts', 'assets'].includes(entry.name)) {
        continue;
      }
      scanDirectory(fullPath, processFile);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      stats.filesProcessed++;
      if (processFile(fullPath)) {
        stats.filesModified++;
      }
    }
  }
}

/**
 * Main execution
 */
function main() {
  console.log('======================================================================');
  console.log('   ADD PLACEHOLDER CSS LINK TO HTML FILES');
  console.log('======================================================================\n');
  
  console.log(`Base directory: ${BASE_DIR}\n`);
  
  // Scan and process files
  console.log('📄 Processing HTML files...\n');
  scanDirectory(BASE_DIR, processHTMLFile);
  
  // Print report
  console.log('\n======================================================================');
  console.log('         ADD CSS LINK REPORT');
  console.log('======================================================================');
  console.log(`Files processed: ${stats.filesProcessed}`);
  console.log(`Files modified: ${stats.filesModified}`);
  console.log(`Errors: ${stats.errors}`);
  console.log('======================================================================\n');
  
  if (stats.filesModified > 0) {
    console.log('✅ Placeholder CSS link added successfully!');
    console.log('\nNext steps:');
    console.log('1. Delete image directories:');
    console.log('   rmdir /s assets\\cdn.prod.website-files.com');
    console.log('   rmdir /s assets\\images');
    console.log('2. Test the site:');
    console.log('   python -m http.server 8000');
  }
  
  process.exit(stats.errors > 0 ? 1 : 0);
}

// Run the script
main();
