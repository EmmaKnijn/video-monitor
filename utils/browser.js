const { chromium } = require('playwright');
require('dotenv').config(); 
const createLogger = require('./logger');

const logger = createLogger('BrowserUtils');

let browser;

/**
 * Initializes and returns a singleton Chromium browser instance.
 * @returns {Promise<import('playwright').Browser>}
 */
async function getBrowser() {
  if (!browser) {
    logger.info('Launching Chromium browser...');
    browser = await chromium.launch({
      headless: process.env.HEADLESS === 'true', // Default to false based on existing config, but allow override
      args: [
        '--disable-blink-features=AutomationControlled',
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
      ignoreDefaultArgs: ['--enable-automation']
    });
  }
  return browser;
}

/**
 * Runs a callback with a new page in a stealth context.
 * @param {function(import('playwright').Page): Promise<any>} callback 
 * @returns {Promise<any>}
 */
async function runWithPage(callback) {
  const browserInstance = await getBrowser();
  
  const context = await browserInstance.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    viewport: null,
    locale: 'en-US',
    timezoneId: 'America/New_York',
    isMobile: false,
    hasTouch: false,
    javaScriptEnabled: true,
  });

  // Apply stealth scripts
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    window.chrome = {
      runtime: {},
      app: {
        InstallState: { DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' },
        RunningState: { CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run', RUNNING: 'running' },
      },
    };
    Object.defineProperty(navigator, 'plugins', {
      get: () => {
        const PDFViewer = { name: 'Chrome PDF Viewer', description: 'Portable Document Format' };
        const plugins = [PDFViewer, PDFViewer, PDFViewer, PDFViewer, PDFViewer];
        plugins.item = (i) => plugins[i];
        plugins.namedItem = (name) => plugins.find(p => p.name === name);
        return plugins;
      },
    });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    
    const getParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(parameter) {
      if (parameter === 37445) return 'Intel Inc.';
      if (parameter === 37446) return 'Intel Iris OpenGL Engine';
      return getParameter.apply(this, [parameter]);
    };
  });

  const page = await context.newPage();

  // Apply Cookies if present
  if (process.env.TIKTOK_AUTH_COOKIE) {
    try {
      const cookies = JSON.parse(process.env.TIKTOK_AUTH_COOKIE);
      if (Array.isArray(cookies)) {
        const fixedCookies = cookies.map(c => {
          const cookie = { ...c };
          if ('partitionKey' in cookie) delete cookie.partitionKey;
          if ('sameSite' in cookie) {
             const lower = String(cookie.sameSite).toLowerCase();
             if (['strict', 'lax', 'none'].includes(lower)) {
               cookie.sameSite = lower.charAt(0).toUpperCase() + lower.slice(1);
             } else {
               delete cookie.sameSite;
             }
          }
          return cookie;
        });
        await context.addCookies(fixedCookies);
        logger.debug('TikTok auth cookie applied.');
      }
    } catch (e) {
      logger.warn(`Error parsing TIKTOK_AUTH_COOKIE: ${e.message}`);
    }
  }

  try {
    return await callback(page);
  } finally {
    await context.close();
  }
}

module.exports = { runWithPage };
