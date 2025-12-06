const { chromium } = require('playwright');
require('dotenv').config(); // Load .env here to ensure TIKTOK_AUTH_COOKIE is available

let browser;

async function getBrowser() {
  if (!browser) {
    browser = await chromium.launch({
      headless: false, // User requested non-headless for visibility/debugging
      args: [
        '--disable-blink-features=AutomationControlled', // Hides navigator.webdriver
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-infobars',
        '--window-position=0,0',
        '--ignore-certificate-errors',
        '--disable-extensions',
        '--start-maximized',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ],
      ignoreDefaultArgs: ['--enable-automation'] // Hides "Chrome is being controlled by automated test software"
    });
  }
  return browser;
}

async function runWithPage(callback) {
  const browserInstance = await getBrowser();
  
  // Create a context that mimics a real desktop browser
  const context = await browserInstance.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    viewport: null, // 0x0 viewport allows the window to be maximized effectively
    locale: 'en-US',
    timezoneId: 'America/New_York',
    isMobile: false,
    hasTouch: false,
    javaScriptEnabled: true,
  });

  // --- Stealth Injection ---
  await context.addInitScript(() => {
    // 1. Override navigator.webdriver
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
    });

    // 2. Mock window.chrome (crucial for some bot detection)
    window.chrome = {
      runtime: {},
      app: {
        InstallState: { DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' },
        RunningState: { CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run', RUNNING: 'running' },
      },
    };

    // 3. Mock navigator.plugins to look populated
    Object.defineProperty(navigator, 'plugins', {
      get: () => {
        // Minimal mock of plugins array
        const PDFViewer = { name: 'Chrome PDF Viewer', description: 'Portable Document Format' };
        const plugins = [PDFViewer, PDFViewer, PDFViewer, PDFViewer, PDFViewer];
        plugins.item = (i) => plugins[i];
        plugins.namedItem = (name) => plugins.find(p => p.name === name);
        return plugins;
      },
    });
    Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en']
    });

    // 4. Mock WebGL Vendor/Renderer to Generic Intel (common)
    const getParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(parameter) {
      // UNMASKED_VENDOR_WEBGL = 37445
      if (parameter === 37445) return 'Intel Inc.';
      // UNMASKED_RENDERER_WEBGL = 37446
      if (parameter === 37446) return 'Intel Iris OpenGL Engine';
      return getParameter.apply(this, [parameter]);
    };
    
    // 5. Mock Permissions
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) => (
      parameters.name === 'notifications' ?
        Promise.resolve({ state: Notification.permission }) :
        originalQuery(parameters)
    );
  });
  // --------------------------

  const page = await context.newPage();

  // Set TikTok auth cookie if available
  const tiktokAuthCookieEnv = process.env.TIKTOK_AUTH_COOKIE;
  if (tiktokAuthCookieEnv) {
    try {
      const cookies = JSON.parse(tiktokAuthCookieEnv);
      // Ensure cookies is an array of objects
      if (Array.isArray(cookies) && cookies.every(c => typeof c === 'object' && c !== null)) {
        const fixedCookies = cookies.map(c => {
          const cookie = { ...c };
          
          // Remove partitionKey as Playwright expects a string but some exports provide an object
          if ('partitionKey' in cookie) {
            delete cookie.partitionKey;
          }
          
          // Normalize sameSite
          if ('sameSite' in cookie) {
            if (typeof cookie.sameSite === 'string') {
              const lower = cookie.sameSite.toLowerCase();
              if (lower === 'strict') cookie.sameSite = 'Strict';
              else if (lower === 'lax') cookie.sameSite = 'Lax';
              else if (lower === 'none' || lower === 'no_restriction') cookie.sameSite = 'None';
              else delete cookie.sameSite;
            } else {
              delete cookie.sameSite;
            }
          }
          return cookie;
        });
        await page.context().addCookies(fixedCookies);
        console.log('TikTok auth cookie applied.');
      } else {
        console.warn('TIKTOK_AUTH_COOKIE is not a valid JSON array of cookie objects.');
      }
    } catch (e) {
      console.error('Error parsing TIKTOK_AUTH_COOKIE:', e);
    }
  }

  try {
    return await callback(page);
  } finally {
    await context.close();
  }
}

module.exports = { runWithPage };