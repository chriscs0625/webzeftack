#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  placeholderService: 'placehold.co', // Using placehold.co as requested
  baseColor: '1a1a1a', // Dark background
  textColor: 'ffffff', // White text
  format: 'png',
  
  // Dimension mappings for different image classes
  dimensionMap: {
    'project-thumb': { width: 800, height: 600, text: 'Project' },
    'blog-thumb': { width: 600, height: 400, text: 'Blog' },
    'team-img': { width: 400, height: 500, text: 'Team' },
    'team-thumb': { width: 400, height: 500, text: 'Team' },
    'research-img': { width: 700, height: 500, text: 'Research' },
    'brand-logo': { width: 200, height: 80, text: 'Logo' },
    'hero-img': { width: 1920, height: 1080, text: 'Hero' },
    'service-icon': { width: 100, height: 100, text: 'Icon' },
    'footer-logo': { width: 150, height: 50, text: 'Logo' },
    'about-image': { width: 800, height: 600, text: 'About' },
    'service-image': { width: 600, height: 500, text: 'Service' },
    'cta-image': { width: 500, height: 400, text: 'CTA' },
    'default': { width: 800, height: 600, text: 'Image' }
  },
  
  // Patterns to detect and replace
  cdnPatterns: [
    /assets\/cdn\.prod\.website-files\.com\/[^\s"')]+/gi,
    /https?:\/\/cdn\.prod\.website-files\.com\/[^\s"')]+/gi,
    /d3e54v103j8qbb\.cloudfront\.net\/[^\s"')]+/gi,
    /assets\/images\/[^\s"')]+/gi,
    /images\/[^\s"')]+/gi
  ],
  
  // Files to process
  htmlExtensions: ['.html'],
  cssExtensions: ['.css'],
  
  // Directories to scan
  scanDirs: [
    '.',
    'blog',
    'category',
    'project',
    'utility-pages'
  ],
  
  // Directories to exclude
  excludeDirs: ['node_modules', '.git', 'scripts']
};

// Statistics tracking
const stats = {
  filesProcessed: 0,
  totalImagesReplaced: 0,
  imagesByType: {},
  errors: [],
  warnings: [],
  filesModified: []
};

// Dry run mode
let isDryRun = process.argv.includes('--dry-run');

// Helper function to generate placeholder URL
function generatePlaceholderURL(width, height, text) {
  return `https://${config.placeholderService}/${width}x${height}/${config.baseColor}/${config.textColor}/${config.format}?text=${encodeURIComponent(text)}`;
}

// Extract classes from an img tag
function extractClasses(imgTag) {
  const classMatch = imgTag.match(/class=["']([^"']+)["']/);
  return classMatch ? classMatch[1].split(/\s+/) : [];
}

// Determine dimensions based on classes
function getDimensionsForClasses(classes) {
  for (const cls of classes) {
    if (config.dimensionMap[cls]) {
      return config.dimensionMap[cls];
    }
  }
  
  // Check for common patterns in class names
  if (classes.some(c => c.includes('hero') || c.includes('banner'))) {
    return { width: 1920, height: 1080, text: 'Hero' };
  }
  if (classes.some(c => c.includes('logo'))) {
    return { width: 200, height: 80, text: 'Logo' };
  }
  if (classes.some(c => c.includes('thumb') || c.includes('thumbnail'))) {
    return { width: 600, height: 400, text: 'Thumbnail' };
  }
  if (classes.some(c => c.includes('team') || c.includes('member'))) {
    return { width: 400, height: 500, text: 'Team' };
  }
  if (classes.some(c => c.includes('icon'))) {
    return { width: 100, height: 100, text: 'Icon' };
  }
  
  return config.dimensionMap['default'];
}

// Extract alt text for better placeholder labels
function extractAltText(imgTag) {
  const altMatch = imgTag.match(/alt=["']([^"']+)["']/);
  return altMatch ? altMatch[1] : null;
}

// Check if image needs replacement
function needsReplacement(src) {
  if (!src) return true;
  if (src.startsWith('data:')) return false; // Skip data URIs
  if (src.includes(config.placeholderService)) return false; // Already a placeholder
  
  // Check if matches any CDN pattern
  for (const pattern of config.cdnPatterns) {
    if (pattern.test(src)) {
      return true;
    }
  }
  
  // Check for broken paths
  if (src.startsWith('assets/') || src.startsWith('images/') || src.startsWith('/assets/') || src.startsWith('/images/')) {
    return true;
  }
  
  return false;
}

// Replace images in HTML content
function replaceImagesInHTML(content, filePath) {
  let modified = content;
  let replacementCount = 0;
  
  // Regular img tags
  const imgRegex = /<img([^>]*)>/gi;
  modified = modified.replace(imgRegex, (match, attributes) => {
    const srcMatch = attributes.match(/src=["']([^"']*)["']/);
    const src = srcMatch ? srcMatch[1] : '';
    
    if (!needsReplacement(src)) {
      return match;
    }
    
    const classes = extractClasses(match);
    const altText = extractAltText(match);
    const dimensions = getDimensionsForClasses(classes);
    const placeholderText = altText || dimensions.text;
    const placeholderURL = generatePlaceholderURL(dimensions.width, dimensions.height, placeholderText);
    
    // Track statistics
    replacementCount++;
    const imageType = classes.find(c => config.dimensionMap[c]) || 'other';
    stats.imagesByType[imageType] = (stats.imagesByType[imageType] || 0) + 1;
    
    // Remove lazy loading attributes and srcset
    let newAttributes = attributes
      .replace(/src=["'][^"']*["']/, `src="${placeholderURL}"`)
      .replace(/srcset=["'][^"']*["']/g, '')
      .replace(/data-src=["'][^"']*["']/g, '')
      .replace(/data-srcset=["'][^"']*["']/g, '')
      .replace(/loading=["']lazy["']/g, '');
    
    // Add alt text if missing
    if (!altText) {
      newAttributes = ` alt="${placeholderText}"` + newAttributes;
    }
    
    console.log(`  ✓ Replaced: ${src.substring(0, 60)}... → ${placeholderURL.substring(0, 60)}...`);
    
    return `<img${newAttributes}>`;
  });
  
  // Background images in style attributes
  const styleRegex = /style=["']([^"']*)["']/gi;
  modified = modified.replace(styleRegex, (match, styleContent) => {
    if (!styleContent.includes('background-image')) {
      return match;
    }
    
    let newStyle = styleContent;
    const bgRegex = /background-image:\s*url\(['"]?([^'")\s]+)['"]?\)/gi;
    
    newStyle = newStyle.replace(bgRegex, (bgMatch, bgUrl) => {
      if (!needsReplacement(bgUrl)) {
        return bgMatch;
      }
      
      const placeholderURL = generatePlaceholderURL(1920, 1080, 'Background');
      replacementCount++;
      stats.imagesByType['background'] = (stats.imagesByType['background'] || 0) + 1;
      
      console.log(`  ✓ Replaced background: ${bgUrl.substring(0, 50)}...`);
      
      return `background-image: url('${placeholderURL}')`;
    });
    
    return `style="${newStyle}"`;
  });
  
  // Picture elements
  const pictureRegex = /<picture[^>]*>([\s\S]*?)<\/picture>/gi;
  modified = modified.replace(pictureRegex, (match, pictureContent) => {
    let newPictureContent = pictureContent;
    
    // Replace source srcset
    newPictureContent = newPictureContent.replace(/srcset=["']([^"']*)["']/g, (srcsetMatch, srcsetValue) => {
      if (!needsReplacement(srcsetValue)) {
        return srcsetMatch;
      }
      
      const placeholderURL = generatePlaceholderURL(800, 600, 'Image');
      console.log(`  ✓ Replaced picture source: ${srcsetValue.substring(0, 50)}...`);
      
      return `srcset="${placeholderURL}"`;
    });
    
    return `<picture>${newPictureContent}</picture>`;
  });
  
  // Video poster attributes
  const videoRegex = /<video([^>]*)>/gi;
  modified = modified.replace(videoRegex, (match, attributes) => {
    const posterMatch = attributes.match(/poster=["']([^"']*)["']/);
    if (!posterMatch) return match;
    
    const poster = posterMatch[1];
    if (!needsReplacement(poster)) {
      return match;
    }
    
    const placeholderURL = generatePlaceholderURL(1920, 1080, 'Video Thumbnail');
    replacementCount++;
    stats.imagesByType['video-poster'] = (stats.imagesByType['video-poster'] || 0) + 1;
    
    console.log(`  ✓ Replaced video poster: ${poster.substring(0, 50)}...`);
    
    const newAttributes = attributes.replace(/poster=["'][^"']*["']/, `poster="${placeholderURL}"`);
    return `<video${newAttributes}>`;
  });
  
  return { content: modified, count: replacementCount };
}

// Replace images in CSS content
function replaceImagesInCSS(content, filePath) {
  let modified = content;
  let replacementCount = 0;
  
  const bgRegex = /background-image:\s*url\(['"]?([^'")\s]+)['"]?\)/gi;
  
  modified = modified.replace(bgRegex, (match, url) => {
    if (!needsReplacement(url)) {
      return match;
    }
    
    const placeholderURL = generatePlaceholderURL(1920, 1080, 'Background');
    replacementCount++;
    stats.imagesByType['css-background'] = (stats.imagesByType['css-background'] || 0) + 1;
    
    console.log(`  ✓ Replaced CSS background: ${url.substring(0, 50)}...`);
    
    return `background-image: url('${placeholderURL}')`;
  });
  
  return { content: modified, count: replacementCount };
}

// Process a single file
function processFile(filePath) {
  try {
    console.log(`\nProcessing: ${filePath}`);
    
    const content = fs.readFileSync(filePath, 'utf8');
    const ext = path.extname(filePath).toLowerCase();
    
    let result;
    if (config.htmlExtensions.includes(ext)) {
      result = replaceImagesInHTML(content, filePath);
    } else if (config.cssExtensions.includes(ext)) {
      result = replaceImagesInCSS(content, filePath);
    } else {
      return;
    }
    
    if (result.count > 0) {
      if (!isDryRun) {
        // Create backup
        const backupPath = filePath + '.backup';
        fs.copyFileSync(filePath, backupPath);
        
        // Write modified content
        fs.writeFileSync(filePath, result.content, 'utf8');
        console.log(`  ✅ Modified: ${result.count} images replaced`);
        
        stats.filesModified.push(filePath);
      } else {
        console.log(`  🔍 [DRY RUN] Would replace: ${result.count} images`);
      }
      
      stats.totalImagesReplaced += result.count;
    } else {
      console.log(`  ⏭️  No changes needed`);
    }
    
    stats.filesProcessed++;
  } catch (error) {
    console.error(`  ❌ Error processing ${filePath}:`, error.message);
    stats.errors.push({ file: filePath, error: error.message });
  }
}

// Recursively scan directory for files
function scanDirectory(dir, baseDir = '') {
  const files = [];
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(baseDir || dir, fullPath);
      
      // Skip excluded directories
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

// Generate report
function generateReport() {
  const divider = '='.repeat(60);
  
  console.log('\n' + divider);
  console.log('         PLACEHOLDER REPLACEMENT REPORT');
  console.log(divider);
  console.log(`Mode: ${isDryRun ? '🔍 DRY RUN (Preview Only)' : '✅ LIVE RUN (Changes Applied)'}`);
  console.log(`Files processed: ${stats.filesProcessed}`);
  console.log(`Total images replaced: ${stats.totalImagesReplaced}`);
  console.log('');
  
  if (Object.keys(stats.imagesByType).length > 0) {
    console.log('By image type:');
    for (const [type, count] of Object.entries(stats.imagesByType).sort((a, b) => b[1] - a[1])) {
      console.log(`  - ${type}: ${count} images`);
    }
    console.log('');
  }
  
  console.log(`Placeholder service: ${config.placeholderService}`);
  console.log(`Status: ${stats.errors.length === 0 ? '✅' : '⚠️'} ${stats.errors.length === 0 ? 'All images replaced successfully' : 'Completed with errors'}`);
  console.log(`Errors: ${stats.errors.length}`);
  
  if (stats.errors.length > 0) {
    console.log('\nErrors encountered:');
    stats.errors.forEach((err, i) => {
      console.log(`  ${i + 1}. ${err.file}: ${err.error}`);
    });
  }
  
  if (stats.warnings.length > 0) {
    console.log('\nWarnings:');
    stats.warnings.forEach((warn, i) => {
      console.log(`  ${i + 1}. ${warn}`);
    });
  }
  
  if (!isDryRun && stats.filesModified.length > 0) {
    console.log('\nFiles modified:');
    stats.filesModified.forEach((file, i) => {
      console.log(`  ${i + 1}. ${file}`);
      console.log(`     Backup: ${file}.backup`);
    });
  }
  
  console.log('\n' + divider);
  
  if (isDryRun) {
    console.log('Next steps:');
    console.log('1. Review the changes above');
    console.log('2. Run without --dry-run to apply changes:');
    console.log('   node scripts/replace-with-placeholders.js');
  } else {
    console.log('Next steps:');
    console.log('1. Test locally: python -m http.server 8000');
    console.log('2. Check all pages for layout issues');
    console.log('3. Verify no 404 errors in Network tab');
    console.log('4. Ready to replace with real images later');
    console.log('');
    console.log('To restore from backups:');
    console.log('  Run: node scripts/restore-backups.js');
  }
  
  console.log(divider + '\n');
  
  // Save report to file
  if (!isDryRun) {
    const reportPath = path.join(__dirname, '..', 'REPLACEMENT_REPORT.txt');
    const reportContent = `
PLACEHOLDER REPLACEMENT REPORT
Generated: ${new Date().toISOString()}
${'='.repeat(60)}

Files processed: ${stats.filesProcessed}
Total images replaced: ${stats.totalImagesReplaced}

By image type:
${Object.entries(stats.imagesByType).map(([type, count]) => `  - ${type}: ${count} images`).join('\n')}

Placeholder service: ${config.placeholderService}
Status: ${stats.errors.length === 0 ? 'Success' : 'Completed with errors'}
Errors: ${stats.errors.length}

Files modified:
${stats.filesModified.map((f, i) => `  ${i + 1}. ${f}`).join('\n')}

${'='.repeat(60)}
    `.trim();
    
    fs.writeFileSync(reportPath, reportContent, 'utf8');
    console.log(`📄 Report saved to: ${reportPath}\n`);
  }
}

// Main execution
function main() {
  console.log('='.repeat(60));
  console.log('   IMAGE PLACEHOLDER REPLACEMENT SCRIPT');
  console.log('='.repeat(60));
  console.log('');
  
  if (isDryRun) {
    console.log('🔍 Running in DRY RUN mode - no files will be modified');
    console.log('   Remove --dry-run flag to apply changes');
  } else {
    console.log('⚠️  LIVE MODE - Files will be modified (backups created)');
  }
  
  console.log('');
  console.log(`Placeholder service: ${config.placeholderService}`);
  console.log(`Base directory: ${process.cwd()}`);
  console.log('');
  
  // Collect all files to process
  const filesToProcess = [];
  
  for (const dir of config.scanDirs) {
    const dirPath = path.resolve(dir);
    if (fs.existsSync(dirPath)) {
      console.log(`Scanning directory: ${dir}`);
      const files = scanDirectory(dirPath);
      filesToProcess.push(...files);
    } else {
      console.log(`⚠️  Directory not found: ${dir}`);
      stats.warnings.push(`Directory not found: ${dir}`);
    }
  }
  
  console.log(`\nFound ${filesToProcess.length} files to process\n`);
  console.log('='.repeat(60));
  
  // Process all files
  for (const file of filesToProcess) {
    processFile(file);
  }
  
  // Generate report
  generateReport();
}

// Run the script
try {
  main();
} catch (error) {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
}
