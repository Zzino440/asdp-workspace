import "server-only";
import puppeteer from "puppeteer-core";

// HTML → PDF con Chromium headless. Su Vercel il Chromium di @sparticuz/chromium; in locale il
// Chrome installato (CHROME_PATH per un percorso diverso da quello standard).
const LOCAL_CHROME: Record<string, string> = {
  win32: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  darwin: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  linux: "/usr/bin/google-chrome",
};

async function launch() {
  if (process.env.VERCEL) {
    const chromium = (await import("@sparticuz/chromium")).default;
    return puppeteer.launch({
      args: await puppeteer.defaultArgs({ args: chromium.args, headless: "shell" }),
      executablePath: await chromium.executablePath(),
      headless: "shell",
    });
  }
  return puppeteer.launch({ executablePath: process.env.CHROME_PATH ?? LOCAL_CHROME[process.platform], headless: true });
}

export async function htmlToPdf(html: string) {
  const browser = await launch();
  try {
    const page = await browser.newPage();
    // Nessuna risorsa esterna: l'HTML è autosufficiente, niente richieste di rete.
    await page.setJavaScriptEnabled(false);
    await page.setContent(html, { waitUntil: "load" });
    return await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate:
        '<div style="width:100%;font-size:8pt;color:#777;text-align:center"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',
    });
  } finally {
    await browser.close();
  }
}
