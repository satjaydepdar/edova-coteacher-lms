const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err.toString()));
  
  console.log('Testing /equations...');
  await page.goto('http://localhost:5175/equations', { waitUntil: 'networkidle2' });
  
  console.log('Testing /redox...');
  await page.goto('http://localhost:5175/redox', { waitUntil: 'networkidle2' });

  await browser.close();
})();
