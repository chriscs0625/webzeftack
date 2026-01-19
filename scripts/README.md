# Scripts Directory

This directory contains automated scripts for managing image placeholders across the website.

## Available Scripts

### 1. `replace-with-placeholders.js`

Replaces all CDN and broken images with placeholder images from placehold.co.

**Features:**
- Scans all HTML and CSS files
- Identifies and replaces CDN image URLs
- Detects appropriate dimensions based on class names
- Removes lazy loading attributes
- Creates automatic backups
- Generates detailed report

**Usage:**

```bash
# Preview changes (dry-run mode)
node scripts/replace-with-placeholders.js --dry-run

# Apply changes (creates backups)
node scripts/replace-with-placeholders.js
```

**Output:**
- Modified HTML/CSS files with placeholders
- `.backup` files for each modified file
- `REPLACEMENT_REPORT.txt` in root directory

---

### 2. `restore-backups.js`

Restores all original files from backup copies.

**Features:**
- Finds all `.backup` files in workspace
- Restores original content
- Removes backup files after restoration
- Reports restoration statistics

**Usage:**

```bash
node scripts/restore-backups.js
```

**Warning:** This will overwrite current files with backup versions. Use with caution.

---

## Configuration

The replacement script uses the following configuration:

### Placeholder Service
- Service: `placehold.co`
- Background Color: `#1a1a1a` (dark)
- Text Color: `#ffffff` (white)
- Format: PNG

### Dimension Mapping

| Image Class | Dimensions | Usage |
|-------------|------------|-------|
| `project-thumb` | 800×600 | Project thumbnails |
| `blog-thumb` | 600×400 | Blog post images |
| `team-img` / `team-thumb` | 400×500 | Team photos |
| `research-img` | 700×500 | Research/about images |
| `brand-logo` | 200×80 | Header logos |
| `hero-img` | 1920×1080 | Hero sections |
| `service-icon` | 100×100 | Service icons |
| `footer-logo` | 150×50 | Footer logos |
| `about-image` | 800×600 | About page images |
| `service-image` | 600×500 | Service images |
| `cta-image` | 500×400 | Call-to-action images |
| Background images | 1920×1080 | CSS backgrounds |
| Video posters | 1920×1080 | Video thumbnails |
| Default | 800×600 | All other images |

### Patterns Detected

The script automatically detects and replaces:

1. **CDN URLs:**
   - `assets/cdn.prod.website-files.com/*`
   - `https://cdn.prod.website-files.com/*`
   - `d3e54v103j8qbb.cloudfront.net/*`

2. **Local Paths:**
   - `assets/images/*`
   - `images/*`

3. **Broken Sources:**
   - Empty `src` attributes
   - Invalid paths

### Processed Elements

- `<img>` tags with `src` attributes
- `<img>` tags with `data-src` (lazy loading)
- `style` attributes with `background-image`
- CSS `background-image` properties
- `<video>` tags with `poster` attributes
- `<picture>` elements with `srcset`

---

## Directories Scanned

- `.` (root)
- `blog/`
- `category/`
- `project/`
- `utility-pages/`

**Excluded:**
- `node_modules/`
- `.git/`
- `scripts/` (this directory)

---

## Safety Features

1. **Dry-Run Mode:** Preview changes without modifying files
2. **Automatic Backups:** Creates `.backup` file for every modified file
3. **Error Handling:** Continues processing even if errors occur
4. **Detailed Logging:** Shows each replacement in real-time
5. **Restoration Script:** Quick rollback to original state

---

## Output Reports

### Console Output
- Real-time progress for each file
- Replacement details for each image
- Summary statistics
- Error reporting (if any)

### Generated Files
- `REPLACEMENT_REPORT.txt` - Detailed statistics
- `*.backup` - Backup copies of modified files

---

## Examples

### Replace Logo
```html
<!-- Before -->
<img src="https://cdn.prod.website-files.com/.../logo.png" alt="Logo" class="brand-logo">

<!-- After -->
<img src="https://placehold.co/200x80/1a1a1a/ffffff/png?text=Logo" alt="Logo" class="brand-logo">
```

### Replace Project Thumbnail
```html
<!-- Before -->
<img src="assets/images/project-1.jpg" alt="Project" class="project-thumb">

<!-- After -->
<img src="https://placehold.co/800x600/1a1a1a/ffffff/png?text=Project" alt="Project" class="project-thumb">
```

### Replace Background Image
```css
/* Before */
.hero-area {
  background-image: url('https://cdn.prod.website-files.com/.../hero.jpg');
}

/* After */
.hero-area {
  background-image: url('https://placehold.co/1920x1080/1a1a1a/ffffff/png?text=Background');
}
```

---

## Troubleshooting

### Script Won't Run
```bash
# Make sure you're in the project root directory
cd c:\Users\chris\OneDrive\Documents\WEBZeftack

# Run the script
node scripts/replace-with-placeholders.js
```

### Images Not Replacing
- Check that the file path is correct
- Verify the image URL matches one of the detection patterns
- Review the console output for error messages

### Want to Undo Changes
```bash
# Restore all original files
node scripts/restore-backups.js
```

### Need to Re-run
If you need to run the script again after restoring:
```bash
# First restore originals
node scripts/restore-backups.js

# Then run replacement again
node scripts/replace-with-placeholders.js
```

---

## Requirements

- Node.js (v12 or higher)
- Write permissions to project files
- Internet connection (for placeholder service validation during testing)

---

## Notes

- The script processes each file only once per run
- Duplicate files in the list are handled automatically
- Class detection is case-insensitive
- Alt text is preserved from original images
- Webflow dynamic classes (`w-dyn-*`) are preserved

---

## Version History

**v1.0.0** (January 19, 2026)
- Initial release
- Support for HTML and CSS files
- Automatic backup creation
- Dry-run mode
- Dimension detection by class name
- Comprehensive error handling
- Detailed reporting

---

## Support

For issues or questions:
1. Check `REPLACEMENT_REPORT.txt` for detailed information
2. Review `IMAGES.md` for image replacement guidelines
3. See `PLACEHOLDER_MIGRATION_COMPLETE.md` for migration summary

---

**Author:** Automated Migration Script  
**Version:** 1.0.0  
**Last Updated:** January 19, 2026
