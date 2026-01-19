#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  // Directories to scan
  scanDirs: ['.', 'blog', 'category', 'project', 'utility-pages'],
  excludeDirs: ['node_modules', '.git', 'scripts', 'backup'],
  
  // File extensions to process
  htmlExtensions: ['.html'],
  cssExtensions: ['.css'],
  jsExtensions: ['.js'],
  
  // Backup directory
  backupDir: 'backup/pre-cleanup',
  
  // Webflow patterns to remove
  webflowPatterns: {
    attributes: ['data-wf-domain', 'data-wf-page', 'data-wf-site', 'data-wf-element-id'],
    classes: /\b(w-[\w-]+|wf-[\w-]+|w-mod-[\w-]+)\b/g,
    scriptUrls: [
      'd3e54v103j8qbb.cloudfront.net',
      'cdn.prod.website-files.com',
      'ajax.googleapis.com',
      'webflow'
    ]
  }
};

// Statistics
const stats = {
  filesProcessed: 0,
  imagesRemoved: 0,
  webflowScriptsRemoved: 0,
  webflowAttributesRemoved: 0,
  webflowClassesRemoved: 0,
  backgroundImagesRemoved: 0,
  filesModified: [],
  errors: []
};

// Dry run mode
let isDryRun = process.argv.includes('--dry-run');

// Helper: Generate placeholder HTML
function generatePlaceholder(originalTag, altText = 'Image', classes = []) {
  const classList = classes.filter(c => !config.webflowPatterns.classes.test(c)).join(' ');
  const placeholderText = altText || 'Image';
  
  return `<div class="${classList} placeholder-image" data-placeholder="${placeholderText}">
  <span class="placeholder-text">${placeholderText}</span>
</div>`;
}

// Helper: Extract classes from tag
function extractClasses(tag) {
  const classMatch = tag.match(/class=["']([^"']+)["']/);
  return classMatch ? classMatch[1].split(/\s+/) : [];
}

// Helper: Extract alt text
function extractAltText(tag) {
  const altMatch = tag.match(/alt=["']([^"']*)["']/);
  return altMatch ? altMatch[1] : 'Image';
}

// Process HTML files
function processHTMLFile(content, filePath) {
  let modified = content;
  let changeCount = {
    images: 0,
    pictures: 0,
    videos: 0,
    scripts: 0,
    attributes: 0,
    classes: 0,
    inlineStyles: 0
  };
  
  // 1. Remove Webflow attributes from <html> tag
  const htmlTagRegex = /<html([^>]*)>/i;
  modified = modified.replace(htmlTagRegex, (match, attributes) => {
    let newAttributes = attributes;
    
    // Remove Webflow data attributes
    config.webflowPatterns.attributes.forEach(attr => {
      const attrRegex = new RegExp(`\\s*${attr}=["'][^"']*["']`, 'gi');
      if (attrRegex.test(newAttributes)) {
        newAttributes = newAttributes.replace(attrRegex, '');
        changeCount.attributes++;
      }
    });
    
    // Remove Webflow classes
    const classMatch = newAttributes.match(/class=["']([^"']+)["']/);
    if (classMatch) {
      const originalClasses = classMatch[1];
      const cleanedClasses = originalClasses.replace(config.webflowPatterns.classes, '').trim().replace(/\s+/g, ' ');
      if (originalClasses !== cleanedClasses) {
        newAttributes = newAttributes.replace(/class=["'][^"']+["']/, `class="${cleanedClasses}"`);
        changeCount.classes++;
      }
    }
    
    return `<html${newAttributes}>`;
  });
  
  // 2. Replace <img> tags with placeholder divs
  const imgRegex = /<img([^>]*)>/gi;
  modified = modified.replace(imgRegex, (match, attributes) => {
    const classes = extractClasses(match);
    const altText = extractAltText(match);
    changeCount.images++;
    
    console.log(`  → Removed <img>: ${altText}`);
    return generatePlaceholder(match, altText, classes);
  });
  
  // 3. Replace <picture> elements with placeholders
  const pictureRegex = /<picture[^>]*>([\s\S]*?)<\/picture>/gi;
  modified = modified.replace(pictureRegex, (match) => {
    // Try to find img tag inside for alt text
    const imgMatch = match.match(/<img[^>]*>/);
    const altText = imgMatch ? extractAltText(imgMatch[0]) : 'Image';
    const classes = imgMatch ? extractClasses(imgMatch[0]) : [];
    
    changeCount.pictures++;
    console.log(`  → Removed <picture>: ${altText}`);
    return generatePlaceholder(match, altText, classes);
  });
  
  // 4. Remove poster attributes from video tags
  const videoRegex = /<video([^>]*)>/gi;
  modified = modified.replace(videoRegex, (match, attributes) => {
    if (attributes.includes('poster=') || attributes.includes('data-poster-url=')) {
      let newAttributes = attributes
        .replace(/\s*poster=["'][^"']*["']/gi, '')
        .replace(/\s*data-poster-url=["'][^"']*["']/gi, '');
      changeCount.videos++;
      console.log(`  → Removed video poster attributes`);
      return `<video${newAttributes}>`;
    }
    return match;
  });
  
  // 5. Remove Webflow script tags
  const scriptRegex = /<script[^>]*>[\s\S]*?<\/script>/gi;
  modified = modified.replace(scriptRegex, (match) => {
    for (const urlPattern of config.webflowPatterns.scriptUrls) {
      if (match.includes(urlPattern)) {
        changeCount.scripts++;
        console.log(`  → Removed Webflow script: ${urlPattern}`);
        return `<!-- Webflow script removed -->\n`;
      }
    }
    return match;
  });
  
  // 6. Remove background-image from inline style attributes
  const styleAttrRegex = /style=["']([^"']*background-image:[^"']*)["']/gi;
  modified = modified.replace(styleAttrRegex, (match, styleContent) => {
    if (styleContent.includes('background-image')) {
      const cleaned = styleContent
        .replace(/background-image:\s*url\([^)]+\)\s*;?/gi, '')
        .trim();
      
      changeCount.inlineStyles++;
      console.log(`  → Removed inline background-image`);
      
      if (cleaned) {
        return `style="${cleaned}"`;
      } else {
        return '';
      }
    }
    return match;
  });
  
  // 7. Remove Webflow CMS classes from div elements
  const divRegex = /<(div|section|article|aside)([^>]*class=["']([^"']*)[^>]*)>/gi;
  modified = modified.replace(divRegex, (match, tag, attributes, classes) => {
    const cleanedClasses = classes.replace(config.webflowPatterns.classes, '').trim().replace(/\s+/g, ' ');
    if (classes !== cleanedClasses) {
      const newAttributes = attributes.replace(/class=["'][^"']*["']/, `class="${cleanedClasses}"`);
      return `<${tag}${newAttributes}>`;
    }
    return match;
  });
  
  // 8. Remove srcset and data-src attributes from any remaining tags
  modified = modified.replace(/\s*srcset=["'][^"']*["']/gi, '');
  modified = modified.replace(/\s*data-src=["'][^"']*["']/gi, '');
  modified = modified.replace(/\s*data-srcset=["'][^"']*["']/gi, '');
  
  // 9. Remove og:image and twitter:image meta tags
  modified = modified.replace(/<meta[^>]*property=["'](og:image|twitter:image)["'][^>]*>/gi, (match) => {
    console.log(`  → Removed social media image meta tag`);
    return '<!-- Social media image meta removed -->';
  });
  
  // 10. Remove favicon and apple-touch-icon links
  modified = modified.replace(/<link[^>]*rel=["'](shortcut icon|apple-touch-icon)["'][^>]*>/gi, (match) => {
    if (match.includes('cdn.prod.website-files.com')) {
      console.log(`  → Removed icon link`);
      return '<!-- Icon link removed -->';
    }
    return match;
  });
  
  return { content: modified, changes: changeCount };
}

// Process CSS files
function processCSSFile(content, filePath) {
  let modified = content;
  let changeCount = 0;
  
  // Replace background-image with background-color
  const bgImageRegex = /background-image:\s*url\([^)]+\)\s*;?/gi;
  modified = modified.replace(bgImageRegex, (match) => {
    changeCount++;
    console.log(`  → Removed CSS background-image`);
    return 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);';
  });
  
  return { content: modified, changes: changeCount };
}

// Process a single file
function processFile(filePath) {
  try {
    console.log(`\n📄 Processing: ${filePath}`);
    
    const content = fs.readFileSync(filePath, 'utf8');
    const ext = path.extname(filePath).toLowerCase();
    
    let result;
    if (config.htmlExtensions.includes(ext)) {
      result = processHTMLFile(content, filePath);
      
      // Sum up changes
      const totalChanges = Object.values(result.changes).reduce((a, b) => a + b, 0);
      
      if (totalChanges > 0) {
        stats.imagesRemoved += result.changes.images + result.changes.pictures;
        stats.webflowScriptsRemoved += result.changes.scripts;
        stats.webflowAttributesRemoved += result.changes.attributes;
        stats.webflowClassesRemoved += result.changes.classes;
        stats.backgroundImagesRemoved += result.changes.inlineStyles;
        
        if (!isDryRun) {
          fs.writeFileSync(filePath, result.content, 'utf8');
          console.log(`  ✅ Modified: ${totalChanges} changes`);
          stats.filesModified.push(filePath);
        } else {
          console.log(`  🔍 [DRY RUN] Would make: ${totalChanges} changes`);
        }
      } else {
        console.log(`  ⏭️  No changes needed`);
      }
      
    } else if (config.cssExtensions.includes(ext)) {
      result = processCSSFile(content, filePath);
      
      if (result.changes > 0) {
        stats.backgroundImagesRemoved += result.changes;
        
        if (!isDryRun) {
          fs.writeFileSync(filePath, result.content, 'utf8');
          console.log(`  ✅ Modified: ${result.changes} background images removed`);
          stats.filesModified.push(filePath);
        } else {
          console.log(`  🔍 [DRY RUN] Would remove: ${result.changes} background images`);
        }
      } else {
        console.log(`  ⏭️  No changes needed`);
      }
    }
    
    stats.filesProcessed++;
    
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
    stats.errors.push({ file: filePath, error: error.message });
  }
}

// Scan directory recursively
function scanDirectory(dir, baseDir = '') {
  const files = [];
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        if (config.excludeDirs.includes(entry.name)) {
          continue;
        }
        files.push(...scanDirectory(fullPath, baseDir || dir));
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (config.htmlExtensions.includes(ext) || config.cssExtensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dir}:`, error.message);
    stats.errors.push({ file: dir, error: error.message });
  }
  
  return files;
}

// Create backup
function createBackup(files) {
  if (isDryRun) return;
  
  console.log('\n📦 Creating backups...');
  
  // Create backup directory
  if (!fs.existsSync(config.backupDir)) {
    fs.mkdirSync(config.backupDir, { recursive: true });
  }
  
  // Copy each file
  for (const file of files) {
    try {
      const relativePath = path.relative(process.cwd(), file);
      const backupPath = path.join(config.backupDir, relativePath);
      const backupDir = path.dirname(backupPath);
      
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      
      fs.copyFileSync(file, backupPath);
    } catch (error) {
      console.error(`  ❌ Backup failed for ${file}: ${error.message}`);
    }
  }
  
  console.log(`  ✅ Backed up ${files.length} files to ${config.backupDir}`);
}

// Generate report
function generateReport() {
  const divider = '='.repeat(70);
  
  console.log('\n' + divider);
  console.log('         IMAGE & WEBFLOW CLEANUP REPORT');
  console.log(divider);
  console.log(`Mode: ${isDryRun ? '🔍 DRY RUN (Preview Only)' : '✅ LIVE RUN (Changes Applied)'}`);
  console.log(`Files processed: ${stats.filesProcessed}`);
  console.log('');
  
  console.log('Cleanup Statistics:');
  console.log(`  - Images removed (img/picture): ${stats.imagesRemoved}`);
  console.log(`  - Background images removed: ${stats.backgroundImagesRemoved}`);
  console.log(`  - Webflow scripts removed: ${stats.webflowScriptsRemoved}`);
  console.log(`  - Webflow attributes removed: ${stats.webflowAttributesRemoved}`);
  console.log(`  - Webflow classes cleaned: ${stats.webflowClassesRemoved}`);
  console.log('');
  
  console.log(`Total files modified: ${stats.filesModified.length}`);
  console.log(`Errors: ${stats.errors.length}`);
  
  if (stats.errors.length > 0) {
    console.log('\n⚠️  Errors encountered:');
    stats.errors.forEach((err, i) => {
      console.log(`  ${i + 1}. ${err.file}: ${err.error}`);
    });
  }
  
  if (!isDryRun && stats.filesModified.length > 0) {
    console.log('\n📁 Files modified:');
    stats.filesModified.forEach((file, i) => {
      console.log(`  ${i + 1}. ${path.relative(process.cwd(), file)}`);
    });
    console.log(`\n💾 Backups saved to: ${config.backupDir}/`);
  }
  
  console.log('\n' + divider);
  
  if (isDryRun) {
    console.log('Next steps:');
    console.log('1. Review the changes above');
    console.log('2. Run without --dry-run to apply changes:');
    console.log('   node scripts/remove-all-images-webflow.js');
  } else {
    console.log('Next steps:');
    console.log('1. Delete image asset files:');
    console.log('   rmdir /s assets\\cdn.prod.website-files.com');
    console.log('   rmdir /s assets\\images');
    console.log('2. Add placeholder CSS stylesheet');
    console.log('3. Test locally: python -m http.server 8000');
    console.log('4. Verify zero console errors and zero image requests');
  }
  
  console.log(divider + '\n');
  
  // Save report
  if (!isDryRun) {
    const reportPath = path.join(process.cwd(), 'CLEANUP_REPORT.txt');
    const reportContent = `
IMAGE & WEBFLOW CLEANUP REPORT
Generated: ${new Date().toISOString()}
${'='.repeat(70)}

Files processed: ${stats.filesProcessed}

Cleanup Statistics:
  - Images removed (img/picture): ${stats.imagesRemoved}
  - Background images removed: ${stats.backgroundImagesRemoved}
  - Webflow scripts removed: ${stats.webflowScriptsRemoved}
  - Webflow attributes removed: ${stats.webflowAttributesRemoved}
  - Webflow classes cleaned: ${stats.webflowClassesRemoved}

Total files modified: ${stats.filesModified.length}
Errors: ${stats.errors.length}

Files modified:
${stats.filesModified.map((f, i) => `  ${i + 1}. ${path.relative(process.cwd(), f)}`).join('\n')}

Backup location: ${config.backupDir}/

${'='.repeat(70)}
    `.trim();
    
    fs.writeFileSync(reportPath, reportContent, 'utf8');
    console.log(`📄 Report saved to: CLEANUP_REPORT.txt\n`);
  }
}

// Main execution
function main() {
  console.log('='.repeat(70));
  console.log('   IMAGE & WEBFLOW CLEANUP SCRIPT');
  console.log('='.repeat(70));
  console.log('');
  
  if (isDryRun) {
    console.log('🔍 Running in DRY RUN mode - no files will be modified');
    console.log('   Remove --dry-run flag to apply changes');
  } else {
    console.log('⚠️  LIVE MODE - Files will be modified (backups will be created)');
  }
  
  console.log('');
  console.log(`Base directory: ${process.cwd()}`);
  console.log('');
  
  // Collect files
  const filesToProcess = [];
  for (const dir of config.scanDirs) {
    const dirPath = path.resolve(dir);
    if (fs.existsSync(dirPath)) {
      console.log(`📂 Scanning directory: ${dir}`);
      const files = scanDirectory(dirPath);
      filesToProcess.push(...files);
    } else {
      console.log(`⚠️  Directory not found: ${dir}`);
    }
  }
  
  console.log(`\n📊 Found ${filesToProcess.length} files to process\n`);
  console.log('='.repeat(70));
  
  // Create backups
  if (!isDryRun) {
    createBackup(filesToProcess);
  }
  
  // Process all files
  for (const file of filesToProcess) {
    processFile(file);
  }
  
  // Generate report
  generateReport();
}

// Run
try {
  main();
} catch (error) {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
}
