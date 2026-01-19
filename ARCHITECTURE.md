# 🛡️ Image URL Enforcer - Architecture & Flow

## 🎯 The Problem

```
HTML Source Code:
<img src="assets/images/project-1.avif">
         ↓
Webflow Runtime Scripts Load
         ↓
JavaScript Overwrites:
<img src="assets/cdn.prod.website-files.com/.../project-1.avif">
         ↓
❌ Images load from CDN instead of local
```

---

## ✅ The Solution - 6-Layer Protection

```
┌─────────────────────────────────────────────────────────────┐
│                    PAGE LOAD STARTS                          │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  LAYER 1: DOMContentLoaded                                   │
│  • Scans all <img> tags immediately                          │
│  • Replaces CDN → Local paths                                │
│  • Runs BEFORE Webflow scripts fully execute                 │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  WEBFLOW SCRIPTS LOAD (the enemy)                            │
│  • webflow.*.js files execute                                │
│  • Try to revert images back to CDN                          │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  LAYER 2: Webflow.ready() Hook                               │
│  • Waits for Webflow to finish initialization                │
│  • Re-scans all images                                       │
│  • Replaces any CDN URLs Webflow changed                     │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  LAYER 3: MutationObserver (Real-time Guardian)              │
│  • Watches DOM for ANY changes to img src attributes         │
│  • Intercepts Webflow's attempts to change images            │
│  • Immediately reverts CDN → Local                           │
│  • Runs continuously throughout page lifetime                │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  LAYER 4: Periodic Checks (Every 500ms for 5 seconds)        │
│  • Safety net for edge cases                                 │
│  • Re-scans images repeatedly during critical load phase     │
│  • Catches delayed Webflow operations                        │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  LAYER 5: Window.load Final Enforcement                      │
│  • Last comprehensive scan after full page load              │
│  • Ensures nothing slipped through                           │
│  • Prints protection summary                                 │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  LAYER 6: Property Descriptor Lock (Nuclear Option)          │
│  • Uses Object.defineProperty() on img.src                   │
│  • Intercepts direct JavaScript assignments                  │
│  • Example: img.src = "cdn.url" → Blocked!                   │
│  • Most aggressive protection layer                          │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  ✅ RESULT: All images use local paths permanently           │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔍 Protection Mechanism Detail

### MutationObserver (Layer 3)

```javascript
Webflow Script:
    img.setAttribute('src', 'cdn.prod.website-files.com/...')
            ↓
MutationObserver detects change
            ↓
Callback fires immediately
            ↓
    img.setAttribute('src', 'assets/images/...')
            ↓
Console: "👁️ Detected change, re-enforcing local image"
```

### Property Lock (Layer 6)

```javascript
Webflow Script:
    img.src = 'cdn.prod.website-files.com/...'
            ↓
Custom setter intercepts
            ↓
Checks: isCDNUrl(value) ? → true
            ↓
Replaces with: 'assets/images/...'
            ↓
Console: "🔒 Blocked CDN assignment"
```

---

## 📊 Data Flow

```
┌──────────────────┐
│  CDN URL         │
│  Detected        │
└────────┬─────────┘
         │
         ↓
┌──────────────────┐         ┌──────────────────┐
│  localImageMap   │←────────│  Cache Check     │
│  (Map Storage)   │         │                  │
└────────┬─────────┘         └──────────────────┘
         │
         ↓ (if not cached)
┌──────────────────┐
│  Convert to      │
│  Local Path      │
│                  │
│  Extract filename│
│  Determine folder│
│  Build path      │
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│  Update Image    │
│  src attribute   │
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│  Lock Property   │
│  with defineProperty│
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│  Add to          │
│  protectedImages │
│  WeakSet         │
└──────────────────┘
```

---

## 🧩 Component Breakdown

### State Management
```javascript
state = {
    localImageMap: Map,        // CDN → Local mappings
    protectedImages: WeakSet,  // Tracked protected images
    replacementCount: Number,  // Total CDN→Local replacements
    interceptionCount: Number, // Blocked override attempts
    observer: MutationObserver,// DOM watcher
    periodicCheckTimer: Timer  // Periodic check handle
}
```

### Configuration
```javascript
CONFIG = {
    cdnPatterns: [             // CDN domains to detect
        'cdn.prod.website-files.com',
        'uploads-ssl.webflow.com',
        // ...
    ],
    targetClasses: [           // Image classes to protect
        '.project-thumb',
        '.blog-thumb',
        // ...
    ],
    periodicCheckInterval: 500,  // Check frequency (ms)
    periodicCheckDuration: 5000, // Check duration (ms)
    debug: true                  // Console logging
}
```

---

## 🔄 Execution Timeline

```
Time    Event
────    ─────────────────────────────────────────────────────
0ms     HTML parsing starts
        
50ms    DOMContentLoaded fires
        → LAYER 1 executes
        → Replaces 30 images
        
100ms   Webflow scripts start loading
        
500ms   LAYER 4 first periodic check
        → Re-scans images
        
750ms   Webflow.ready() fires
        → LAYER 2 executes
        → Finds 5 images Webflow changed
        → Replaces them
        
1000ms  LAYER 4 second periodic check
        → MutationObserver detects 3 attempts
        → Blocks them immediately
        
1500ms  LAYER 4 third periodic check
        
2000ms  User clicks tab (dynamic content loads)
        → MutationObserver detects new images
        → Processes them immediately
        
2500ms  window.load fires
        → LAYER 5 executes
        → Final scan: all images protected
        → Prints summary

3000ms+ MutationObserver continues monitoring
        Property locks remain active
        Any future CDN attempts blocked
```

---

## 🎯 Attack Vectors & Defenses

| Webflow Attack Vector | Our Defense | Layer |
|-----------------------|-------------|-------|
| Initial page load sets CDN URLs | Initial replacement scan | Layer 1 |
| Webflow.ready() overwrites | Hook into ready event | Layer 2 |
| setAttribute('src', cdn) | MutationObserver watches attributes | Layer 3 |
| Delayed async loading | Periodic checks catch late changes | Layer 4 |
| After window.load changes | Final enforcement + continued observation | Layer 5 |
| img.src = cdn (direct JS) | Property descriptor intercepts | Layer 6 |
| Dynamic content (AJAX) | Observer watches for new nodes | Layer 3 |
| Lazy-loaded images | IntersectionObserver handler | Additional |

---

## 🧪 Console Output Example

```
ℹ️ [ImageEnforcer] ═══════════════════════════════════════
ℹ️ [ImageEnforcer] WEBFLOW IMAGE URL ENFORCER - Initializing...
ℹ️ [ImageEnforcer] ═══════════════════════════════════════

ℹ️ [ImageEnforcer] LAYER 1: Initial replacement starting...
✅ [ImageEnforcer] Replaced [layer1-initial]: 
   https://cdn.prod.website-files.com/68e8e6ea3fe47c36aeb4b18c/68e8e71e3b36d74391871f2d_project-2.avif 
   → assets/images/68e8e71e3b36d74391871f2d_project-2.avif

✅ [ImageEnforcer] Replaced [layer1-initial]: 
   https://cdn.prod.website-files.com/68e8e6ea3fe47c36aeb4b18c/68e8e72aa6e9dda063a5d5a0_project-1.avif 
   → assets/images/68e8e72aa6e9dda063a5d5a0_project-1.avif

ℹ️ [ImageEnforcer] Processed 30 images (source: layer1-initial)

ℹ️ [ImageEnforcer] LAYER 2: Waiting for Webflow.ready()...
ℹ️ [ImageEnforcer] LAYER 3: Starting MutationObserver...
✅ [ImageEnforcer] MutationObserver active and watching for changes

ℹ️ [ImageEnforcer] LAYER 4: Starting periodic checks...
ℹ️ [ImageEnforcer] Processed 2 images (source: layer4-periodic)

ℹ️ [ImageEnforcer] LAYER 2: Webflow.ready() triggered, re-enforcing...
✅ [ImageEnforcer] Replaced [layer2-webflow-ready]: 
   https://cdn.prod.website-files.com/68e8e6ea3fe47c36aeb4b18c/68e8e8a5e3531c0930804379_project-3.avif 
   → assets/images/68e8e8a5e3531c0930804379_project-3.avif

🔒 [ImageEnforcer] Blocked CDN assignment: 
   cdn.prod.website-files.com/68e8e6ea3fe47c36aeb4b18c/68e8e71e3b36d74391871f2d_project-2.avif 
   → assets/images/68e8e71e3b36d74391871f2d_project-2.avif

👁️ [ImageEnforcer] Detected change, re-enforcing local image

ℹ️ [ImageEnforcer] LAYER 4: Periodic checks completed
ℹ️ [ImageEnforcer] LAYER 5: window.load triggered, final enforcement...
ℹ️ [ImageEnforcer] Processed 0 images (source: layer5-window-load)

✅ [ImageEnforcer] ═══════════════════════════════════════
✅ [ImageEnforcer] PROTECTION SUMMARY
✅ [ImageEnforcer] Total replacements: 42
✅ [ImageEnforcer] Total interceptions: 15
✅ [ImageEnforcer] Protected images: 42
✅ [ImageEnforcer] Images in document: 42
✅ [ImageEnforcer] ═══════════════════════════════════════
```

---

## 💡 Key Design Decisions

### Why WeakSet for Protected Images?
- Doesn't prevent garbage collection
- No memory leaks from removed images
- Fast has() checks

### Why Map for URL Mappings?
- O(1) lookup performance
- Prevents redundant path conversions
- Caches expensive operations

### Why Multiple Layers Instead of One?
- Webflow has multiple override points
- Different timing vulnerabilities
- Redundancy = reliability
- If one layer fails, others catch it

### Why MutationObserver vs setInterval?
- More efficient (event-driven)
- Instant response (no polling delay)
- Catches ALL DOM changes
- But we also use periodic checks as backup

---

## 🔧 Maintenance

### Adding New Image Locations

Edit `convertToLocalPath()`:
```javascript
if (filename.includes('project')) {
    localPath = `assets/images/${filename}`;
} else if (filename.includes('your-new-type')) {
    localPath = `assets/your-folder/${filename}`;  // Add this
}
```

### Adjusting Timing

Edit `CONFIG`:
```javascript
periodicCheckInterval: 500,  // Check more/less frequently
periodicCheckDuration: 5000, // Check for longer/shorter time
```

### Disable Specific Layer

Comment out in `initialize()`:
```javascript
// layer3_MutationObserver();  // Disable Layer 3
```

---

## 📈 Performance Impact

| Metric | Impact | Notes |
|--------|--------|-------|
| Page Load Time | +5-20ms | Initial scan overhead |
| Memory Usage | +50-100KB | WeakSet + Map storage |
| CPU (ongoing) | Minimal | MutationObserver is efficient |
| Network Requests | Reduced | No CDN requests |
| Image Load Time | Improved | Local files faster than CDN |

**Net Result: Better performance** (local files > CDN for static files)

---

## 🎓 Learning Resources

- [MutationObserver MDN](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver)
- [Object.defineProperty MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty)
- [WeakSet MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakSet)
- [Document Lifecycle Events](https://developer.mozilla.org/en-US/docs/Web/API/Document/readyState)

---

**This architecture ensures Webflow cannot win the battle of image URLs.** 🏆
