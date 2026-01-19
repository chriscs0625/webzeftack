/**
 * Auto-inject Image URL Enforcer Script into All HTML Files
 * 
 * This script adds the enforce-local-images.js script tag before </body>
 * in all HTML files in the project.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const ENFORCER_SCRIPT_TAG = `<!-- Image URL Enforcer - Prevents Webflow from reverting local paths to CDN URLs --><script src="assets/js/enforce-local-images.js"></script>`;
const MARKER = '</body>';

// Directories to scan
const directories = [
    '.',
    'blog',
    'category',
    'project',
    'utility-pages'
];

let processedCount = 0;
let skippedCount = 0;
let errorCount = 0;

/**
 * Check if file already has the enforcer script
 */
function hasEnforcerScript(content) {
    return content.includes('enforce-local-images.js');
}

/**
 * Inject the enforcer script before </body>
 */
function injectEnforcerScript(content) {
    // Find the last occurrence of </body>
    const bodyCloseIndex = content.lastIndexOf(MARKER);
    
    if (bodyCloseIndex === -1) {
        console.log('  ⚠️  No </body> tag found');
        return null;
    }
    
    // Insert the script tag before </body>
    const before = content.substring(0, bodyCloseIndex);
    const after = content.substring(bodyCloseIndex);
    
    return before + ENFORCER_SCRIPT_TAG + after;
}

/**
 * Process a single HTML file
 */
function processHtmlFile(filePath) {
    try {
        console.log(`\nProcessing: ${filePath}`);
        
        // Read file
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Check if already has enforcer script
        if (hasEnforcerScript(content)) {
            console.log('  ⏭️  Already has enforcer script, skipping');
            skippedCount++;
            return;
        }
        
        // Inject the script
        const newContent = injectEnforcerScript(content);
        
        if (!newContent) {
            console.log('  ❌ Failed to inject (no </body> tag)');
            errorCount++;
            return;
        }
        
        // Write back to file
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log('  ✅ Successfully injected enforcer script');
        processedCount++;
        
    } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
        errorCount++;
    }
}

/**
 * Scan directory for HTML files
 */
function scanDirectory(dirPath) {
    console.log(`\n📁 Scanning directory: ${dirPath}`);
    
    try {
        const files = fs.readdirSync(dirPath);
        
        files.forEach(file => {
            const filePath = path.join(dirPath, file);
            const stat = fs.statSync(filePath);
            
            // Only process HTML files
            if (stat.isFile() && file.endsWith('.html')) {
                processHtmlFile(filePath);
            }
        });
        
    } catch (error) {
        console.log(`  ❌ Error scanning directory: ${error.message}`);
    }
}

/**
 * Main execution
 */
function main() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  INJECT IMAGE URL ENFORCER SCRIPT');
    console.log('═══════════════════════════════════════════════════════════════');
    
    // Scan all directories
    directories.forEach(dir => {
        scanDirectory(dir);
    });
    
    // Print summary
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`✅ Processed: ${processedCount} files`);
    console.log(`⏭️  Skipped: ${skippedCount} files (already has script)`);
    console.log(`❌ Errors: ${errorCount} files`);
    console.log(`📊 Total: ${processedCount + skippedCount + errorCount} HTML files`);
    console.log('═══════════════════════════════════════════════════════════════\n');
}

// Run the script
main();
