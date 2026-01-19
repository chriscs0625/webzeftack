/**
 * ═══════════════════════════════════════════════════════════════════════════
 * WEBFLOW IMAGE URL ENFORCER - Persistent Local Path Protection
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Problem: Webflow's runtime scripts dynamically revert local image URLs 
 * back to CDN URLs, even when HTML source shows local paths.
 * 
 * Solution: Multi-layer protection system that aggressively enforces local 
 * image paths and prevents Webflow from overriding them.
 * 
 * Protection Layers:
 * 1. Initial replacement on DOMContentLoaded
 * 2. Re-apply after Webflow.ready()
 * 3. MutationObserver watching for src attribute changes
 * 4. Periodic checks during initial load phase
 * 5. Final enforcement on window.load
 * 6. Property descriptor locking to intercept direct assignments
 * ═══════════════════════════════════════════════════════════════════════════
 */

(function() {
    'use strict';

    // ═══════════════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════
    
    const CONFIG = {
        // CDN patterns to detect and replace
        cdnPatterns: [
            'cdn.prod.website-files.com',
            'uploads-ssl.webflow.com',
            'd3e54v103j8qbb.cloudfront.net',
            'assets-global.website-files.com'
        ],
        
        // Target image classes that Webflow typically manipulates
        targetClasses: [
            '.project-thumb',
            '.blog-thumb',
            '.team-img',
            '.team-thumb',
            '.research-img',
            '.brand-logo',
            '.nav-logo',
            '.footer-logo',
            '.blog-icon',
            '.project-icon'
        ],
        
        // Dynamic content selectors (Webflow CMS)
        dynamicSelectors: [
            '.w-dyn-item',
            '.w-dyn-list',
            '[role="listitem"]',
            '.w-dyn-bind-empty'
        ],
        
        // Periodic check settings
        periodicCheckInterval: 500, // ms
        periodicCheckDuration: 5000, // ms
        
        // Debug mode - set to false in production
        debug: true
    };

    // ═══════════════════════════════════════════════════════════════════════
    // STATE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════
    
    const state = {
        localImageMap: new Map(), // CDN URL → Local path mapping
        protectedImages: new WeakSet(), // Track protected images
        replacementCount: 0,
        interceptionCount: 0,
        observer: null,
        periodicCheckTimer: null
    };

    // ═══════════════════════════════════════════════════════════════════════
    // UTILITY FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * Check if URL is a CDN URL
     */
    function isCDNUrl(url) {
        if (!url || typeof url !== 'string') return false;
        return CONFIG.cdnPatterns.some(pattern => url.includes(pattern));
    }

    /**
     * Convert CDN URL to local path
     * Examples:
     * - https://cdn.prod.website-files.com/68e8e6ea3fe47c36aeb4b18c/project-1.avif
     *   → assets/images/project-1.avif
     * - assets/cdn.prod.website-files.com/68e8e6ea3fe47c36aeb4b18c/project-1.avif
     *   → assets/images/project-1.avif
     */
    function convertToLocalPath(cdnUrl) {
        if (!cdnUrl || typeof cdnUrl !== 'string') return cdnUrl;
        
        // Extract filename from CDN URL
        const urlParts = cdnUrl.split('/');
        const filename = urlParts[urlParts.length - 1];
        
        // Check if we have a cached mapping
        if (state.localImageMap.has(cdnUrl)) {
            return state.localImageMap.get(cdnUrl);
        }
        
        // Determine local path based on filename pattern
        let localPath;
        
        if (filename.includes('project')) {
            localPath = `assets/images/${filename}`;
        } else if (filename.includes('blog')) {
            localPath = `assets/images/${filename}`;
        } else if (filename.includes('team')) {
            localPath = `assets/images/${filename}`;
        } else if (filename.includes('artego') || filename.includes('logo')) {
            localPath = `assets/images/${filename}`;
        } else {
            // Default to images folder
            localPath = `assets/images/${filename}`;
        }
        
        // Cache the mapping
        state.localImageMap.set(cdnUrl, localPath);
        
        return localPath;
    }

    /**
     * Console logging with emoji indicators
     */
    function log(type, message, data = null) {
        if (!CONFIG.debug) return;
        
        const emoji = {
            block: '🔒',
            detect: '👁️',
            success: '✅',
            info: 'ℹ️',
            warning: '⚠️',
            error: '❌'
        };
        
        const prefix = `${emoji[type] || '📌'} [ImageEnforcer]`;
        
        if (data) {
            console.log(`${prefix} ${message}`, data);
        } else {
            console.log(`${prefix} ${message}`);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CORE ENFORCEMENT FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * LAYER 6: Lock image src property using Object.defineProperty
     * This intercepts direct JavaScript assignments to img.src
     */
    function lockImageSrc(img, localPath) {
        // Skip if already protected
        if (state.protectedImages.has(img)) return;
        
        try {
            // Store original descriptor
            const originalDescriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
            
            // Create locked descriptor
            Object.defineProperty(img, 'src', {
                get: function() {
                    return this.getAttribute('src') || localPath;
                },
                set: function(value) {
                    // Only allow non-CDN URLs
                    if (!isCDNUrl(value)) {
                        this.setAttribute('src', value);
                    } else {
                        const correctedPath = convertToLocalPath(value);
                        this.setAttribute('src', correctedPath);
                        state.interceptionCount++;
                        log('block', `Blocked CDN assignment: ${value.substring(0, 60)}... → ${correctedPath}`);
                    }
                },
                configurable: true,
                enumerable: true
            });
            
            state.protectedImages.add(img);
        } catch (error) {
            log('error', 'Failed to lock image src:', error);
        }
    }

    /**
     * Enforce local image path on a single image element
     */
    function enforceLocalImage(img, source = 'unknown') {
        if (!img || img.tagName !== 'IMG') return false;
        
        const currentSrc = img.getAttribute('src');
        
        // Skip if already local or empty
        if (!currentSrc || !isCDNUrl(currentSrc)) {
            // Still lock it to prevent future changes
            const localSrc = img.getAttribute('data-local-src') || currentSrc;
            if (localSrc) {
                lockImageSrc(img, localSrc);
            }
            return false;
        }
        
        // Convert to local path
        const localPath = convertToLocalPath(currentSrc);
        
        // Update src attribute
        img.setAttribute('src', localPath);
        
        // Store original local path for reference
        img.setAttribute('data-local-src', localPath);
        
        // Lock the src property
        lockImageSrc(img, localPath);
        
        state.replacementCount++;
        log('success', `Replaced [${source}]: ${currentSrc.substring(0, 50)}... → ${localPath}`);
        
        return true;
    }

    /**
     * Process all images in the document
     */
    function processAllImages(source = 'scan') {
        const images = document.querySelectorAll('img');
        let processed = 0;
        
        images.forEach(img => {
            if (enforceLocalImage(img, source)) {
                processed++;
            }
        });
        
        if (processed > 0) {
            log('info', `Processed ${processed} images (source: ${source})`);
        }
        
        return processed;
    }

    /**
     * Process images within specific containers (for dynamic content)
     */
    function processDynamicContainers() {
        CONFIG.dynamicSelectors.forEach(selector => {
            const containers = document.querySelectorAll(selector);
            containers.forEach(container => {
                const images = container.querySelectorAll('img');
                images.forEach(img => enforceLocalImage(img, 'dynamic'));
            });
        });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PROTECTION LAYER IMPLEMENTATIONS
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * LAYER 1: Initial replacement on DOMContentLoaded
     */
    function layer1_InitialReplacement() {
        log('info', 'LAYER 1: Initial replacement starting...');
        processAllImages('layer1-initial');
        processDynamicContainers();
    }

    /**
     * LAYER 2: Re-apply after Webflow.ready()
     */
    function layer2_WebflowReady() {
        log('info', 'LAYER 2: Waiting for Webflow.ready()...');
        
        const checkWebflow = () => {
            if (window.Webflow && typeof window.Webflow.ready === 'function') {
                window.Webflow.ready(() => {
                    log('info', 'LAYER 2: Webflow.ready() triggered, re-enforcing...');
                    setTimeout(() => {
                        processAllImages('layer2-webflow-ready');
                        processDynamicContainers();
                    }, 100);
                });
            }
        };
        
        // Try immediately
        checkWebflow();
        
        // Also try after delay (fallback)
        setTimeout(checkWebflow, 1000);
    }

    /**
     * LAYER 3: MutationObserver watching for attribute changes
     */
    function layer3_MutationObserver() {
        log('info', 'LAYER 3: Starting MutationObserver...');
        
        const callback = (mutations) => {
            mutations.forEach(mutation => {
                // Watch for src attribute changes
                if (mutation.type === 'attributes' && mutation.attributeName === 'src') {
                    const img = mutation.target;
                    if (img.tagName === 'IMG') {
                        enforceLocalImage(img, 'layer3-observer');
                    }
                }
                
                // Watch for new nodes added (AJAX content)
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) { // Element node
                            // Check if node itself is an image
                            if (node.tagName === 'IMG') {
                                enforceLocalImage(node, 'layer3-added');
                            }
                            // Check for images within the node
                            const images = node.querySelectorAll ? node.querySelectorAll('img') : [];
                            images.forEach(img => enforceLocalImage(img, 'layer3-added'));
                        }
                    });
                }
            });
        };
        
        state.observer = new MutationObserver(callback);
        
        state.observer.observe(document.body, {
            attributes: true,
            attributeFilter: ['src', 'data-src', 'srcset'],
            subtree: true,
            childList: true,
            characterData: false
        });
        
        log('success', 'MutationObserver active and watching for changes');
    }

    /**
     * LAYER 4: Periodic checks during initial load phase
     */
    function layer4_PeriodicChecks() {
        log('info', 'LAYER 4: Starting periodic checks...');
        
        let elapsed = 0;
        
        state.periodicCheckTimer = setInterval(() => {
            elapsed += CONFIG.periodicCheckInterval;
            
            processAllImages('layer4-periodic');
            processDynamicContainers();
            
            if (elapsed >= CONFIG.periodicCheckDuration) {
                clearInterval(state.periodicCheckTimer);
                log('info', 'LAYER 4: Periodic checks completed');
            }
        }, CONFIG.periodicCheckInterval);
    }

    /**
     * LAYER 5: Final enforcement on window.load
     */
    function layer5_WindowLoad() {
        log('info', 'LAYER 5: Waiting for window.load...');
        
        window.addEventListener('load', () => {
            log('info', 'LAYER 5: window.load triggered, final enforcement...');
            setTimeout(() => {
                processAllImages('layer5-window-load');
                processDynamicContainers();
                printSummary();
            }, 500);
        });
    }

    /**
     * Additional: Handle lazy-loaded images (Intersection Observer)
     */
    function handleLazyLoading() {
        const lazyImages = document.querySelectorAll('img[loading="lazy"]');
        
        if ('IntersectionObserver' in window) {
            const lazyImageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        enforceLocalImage(img, 'lazy-load');
                        lazyImageObserver.unobserve(img);
                    }
                });
            });
            
            lazyImages.forEach(img => lazyImageObserver.observe(img));
        }
    }

    /**
     * Remove Webflow data attributes to prevent re-initialization
     */
    function disableWebflowDataAttributes() {
        // Remove from <html> tag
        const html = document.documentElement;
        ['data-wf-domain', 'data-wf-page', 'data-wf-site'].forEach(attr => {
            if (html.hasAttribute(attr)) {
                html.removeAttribute(attr);
                log('info', `Removed ${attr} from <html>`);
            }
        });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // INITIALIZATION & SUMMARY
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * Print summary of enforcement actions
     */
    function printSummary() {
        log('success', '═══════════════════════════════════════════════════════');
        log('success', `PROTECTION SUMMARY`);
        log('success', `Total replacements: ${state.replacementCount}`);
        log('success', `Total interceptions: ${state.interceptionCount}`);
        log('success', `Protected images: ${state.protectedImages.size || 'N/A'}`);
        log('success', `Images in document: ${document.querySelectorAll('img').length}`);
        log('success', '═══════════════════════════════════════════════════════');
    }

    /**
     * Initialize all protection layers
     */
    function initialize() {
        log('info', '═══════════════════════════════════════════════════════');
        log('info', 'WEBFLOW IMAGE URL ENFORCER - Initializing...');
        log('info', '═══════════════════════════════════════════════════════');
        
        // LAYER 1: Initial replacement
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', layer1_InitialReplacement);
        } else {
            layer1_InitialReplacement();
        }
        
        // LAYER 2: Webflow.ready()
        layer2_WebflowReady();
        
        // LAYER 3: MutationObserver
        if (document.body) {
            layer3_MutationObserver();
        } else {
            document.addEventListener('DOMContentLoaded', layer3_MutationObserver);
        }
        
        // LAYER 4: Periodic checks
        layer4_PeriodicChecks();
        
        // LAYER 5: window.load
        layer5_WindowLoad();
        
        // Additional: Lazy loading support
        handleLazyLoading();
        
        // Optional: Disable Webflow data attributes (use with caution)
        // Uncomment the next line if you want to completely disable Webflow runtime
        // disableWebflowDataAttributes();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // START EXECUTION
    // ═══════════════════════════════════════════════════════════════════════
    
    // Start immediately if possible, otherwise wait for DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

    // Expose state for debugging (only in debug mode)
    if (CONFIG.debug) {
        window.ImageEnforcerDebug = {
            state,
            processAllImages,
            printSummary,
            config: CONFIG
        };
        log('info', 'Debug interface available at window.ImageEnforcerDebug');
    }

})();
