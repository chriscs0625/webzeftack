# Image Placeholder Replacement Guide

## Overview

This document describes the image placeholder strategy used across the website and provides instructions for replacing placeholders with real images in the future.

## Current Placeholder Service

**Service:** placehold.co  
**Base URL:** `https://placehold.co/`  
**Color Scheme:** Dark background (#1a1a1a) with white text (#ffffff)

## Image Dimension Mapping

All images have been replaced with appropriately sized placeholders based on their class names and context:

### Image Types and Dimensions

| Image Class/Type | Dimensions | Placeholder Text | Usage |
|-----------------|------------|------------------|-------|
| `project-thumb` | 800×600 | "Project" | Project thumbnails and cards |
| `blog-thumb` | 600×400 | "Blog" | Blog post thumbnails |
| `team-img` | 400×500 | "Team" | Team member photos |
| `team-thumb` | 400×500 | "Team" | Team member thumbnails |
| `research-img` | 700×500 | "Research" | Research/about section images |
| `brand-logo` | 200×80 | "Logo" | Brand logos |
| `hero-img` | 1920×1080 | "Hero" | Hero section images |
| `service-icon` | 100×100 | "Icon" | Service icons |
| `footer-logo` | 150×50 | "Logo" | Footer logo |
| `about-image` | 800×600 | "About" | About page images |
| `service-image` | 600×500 | "Service" | Service page images |
| `cta-image` | 500×400 | "CTA" | Call-to-action images |
| Background images | 1920×1080 | "Background" | CSS/inline background images |
| Video posters | 1920×1080 | "Video Thumbnail" | Video thumbnail posters |
| Default | 800×600 | "Image" | All other images |

## Placeholder URL Format

```
https://placehold.co/{width}x{height}/{bg_color}/{text_color}/png?text={text}
```

**Example:**
```html
<img src="https://placehold.co/800x600/1a1a1a/ffffff/png?text=Project" alt="Project" class="project-thumb">
```

## Replaced Image Patterns

The following patterns were identified and replaced:

1. **CDN URLs:**
   - `assets/cdn.prod.website-files.com/*`
   - `https://cdn.prod.website-files.com/*`

2. **CloudFront URLs:**
   - `d3e54v103j8qbb.cloudfront.net/*`

3. **Local Image Paths:**
   - `assets/images/*`
   - `images/*`

4. **Broken or Missing Sources:**
   - Empty `src` attributes
   - Invalid paths

## How to Replace Placeholders with Real Images

### Option 1: Manual Replacement (Small Scale)

For individual images:

1. Prepare your real image (e.g., `project-hero.jpg`)
2. Optimize for web (compress, resize appropriately)
3. Place in `assets/images/` directory
4. Find the placeholder in your HTML:
   ```html
   <img src="https://placehold.co/800x600/1a1a1a/ffffff/png?text=Project" alt="Project" class="project-thumb">
   ```
5. Replace with real image path:
   ```html
   <img src="assets/images/project-hero.jpg" alt="Project" class="project-thumb">
   ```

### Option 2: Batch Replacement (Recommended)

Create a mapping file `image-replacements.json`:

```json
{
  "https://placehold.co/800x600/1a1a1a/ffffff/png?text=Project": "assets/images/project-1.jpg",
  "https://placehold.co/600x400/1a1a1a/ffffff/png?text=Blog": "assets/images/blog-hero.jpg"
}
```

Then run a replacement script:

```javascript
const replacements = require('./image-replacements.json');

// For each HTML file
// Replace placeholder URLs with real image paths
```

### Option 3: Using a Node.js Script

Create `scripts/replace-placeholders-with-real.js`:

```javascript
const fs = require('fs');
const path = require('path');

const imageMap = {
  // Map placeholder text to real image files
  'Project': 'project-{index}.jpg',
  'Blog': 'blog-{index}.jpg',
  'Team': 'team-{index}.jpg',
  // ... etc
};

// Scan HTML files
// Find placeholders
// Replace with mapped images
// Maintain classes and attributes
```

## Image Naming Convention

When adding real images, follow this naming convention:

```
{category}-{descriptor}-{index}.{ext}

Examples:
- project-skyview-1.jpg
- project-skyview-2.jpg
- team-john-smith.jpg
- blog-sustainability-hero.jpg
- service-architecture-icon.png
```

## Image Optimization Guidelines

Before adding real images:

1. **Format:**
   - Use WebP for modern browsers
   - Provide JPEG/PNG fallbacks
   - Use PNG for logos and icons with transparency

2. **Size:**
   - Hero images: Max 1920×1080, ~200KB
   - Thumbnails: Max 800×600, ~100KB
   - Team photos: Max 400×500, ~50KB
   - Icons: Max 100×100, ~10KB

3. **Compression:**
   - Use tools like TinyPNG, ImageOptim, or Squoosh
   - Target 70-80% quality for JPEGs
   - Use progressive/optimized encoding

4. **Responsive Images:**
   ```html
   <picture>
     <source srcset="image-800w.webp" type="image/webp" media="(min-width: 800px)">
     <source srcset="image-400w.webp" type="image/webp" media="(min-width: 400px)">
     <img src="image-800w.jpg" alt="Description">
   </picture>
   ```

## Files Modified

The following files contain placeholder images:

- `index.html` - Homepage
- `about.html` - About page
- `service.html` - Services page
- `projects.html` - Projects listing
- `contact.html` - Contact page
- `blog.html` - Blog listing
- `blog/*.html` - Individual blog posts
- `project/*.html` - Individual project pages
- `utility-pages/*.html` - Utility pages
- `assets/custom.css` - Background images in CSS

## Testing After Replacement

After replacing placeholders with real images:

1. **Visual Check:**
   - Open each page in browser
   - Verify images display correctly
   - Check responsive behavior

2. **Performance Check:**
   - Open DevTools → Network tab
   - Verify image sizes are reasonable
   - Check load times

3. **SEO Check:**
   - Verify all images have descriptive `alt` attributes
   - Check that images have appropriate dimensions

4. **Console Check:**
   - Open DevTools → Console
   - Verify no 404 errors
   - Check for no broken images

## Reverting to Placeholders

If you need to restore the placeholder images:

1. The script created `.backup` files for all modified files
2. Run the restore script:
   ```bash
   node scripts/restore-backups.js
   ```

## Backup Location

Original files before placeholder replacement:
- Saved as: `{filename}.backup`
- Location: Same directory as original file
- Created: Automatically by the replacement script

## CDN Dependencies Removed

The following CDN dependencies have been completely removed:

✅ `cdn.prod.website-files.com` - All Webflow CDN images  
✅ `d3e54v103j8qbb.cloudfront.net` - CloudFront assets  
✅ `ajax.googleapis.com` - (If images were hosted there)  

## Next Steps

1. **Collect Real Images:**
   - Gather project photos
   - Collect team member photos
   - Prepare blog images
   - Design service icons

2. **Optimize Images:**
   - Compress all images
   - Resize to appropriate dimensions
   - Convert to modern formats (WebP)

3. **Organize Images:**
   - Place in `assets/images/`
   - Follow naming convention
   - Create subdirectories if needed:
     - `assets/images/projects/`
     - `assets/images/team/`
     - `assets/images/blog/`

4. **Replace Placeholders:**
   - Use batch replacement script
   - Update one section at a time
   - Test after each update

5. **Final Testing:**
   - Test all pages
   - Check mobile responsiveness
   - Verify performance
   - Check SEO attributes

## Support

If you encounter issues:

1. Check the `REPLACEMENT_REPORT.txt` file for details
2. Review browser console for errors
3. Verify image paths are correct
4. Ensure images are accessible

## Script Usage

```bash
# Preview changes (dry run)
node scripts/replace-with-placeholders.js --dry-run

# Apply changes
node scripts/replace-with-placeholders.js

# Restore from backups
node scripts/restore-backups.js
```

---

**Last Updated:** ${new Date().toISOString()}  
**Script Version:** 1.0.0  
**Placeholder Service:** placehold.co
