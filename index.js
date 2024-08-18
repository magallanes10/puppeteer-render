const fs = require('fs');
const path = require('path');
const freeport = require('freeport');
const ProxyChain = require('proxy-chain');
const puppeteer = require('puppeteer-core');
const { exec } = require('node:child_process');
const { promisify } = require('node:util');
const express = require('express');

const app = express();
const port = 3000;
const screenshotPath = path.join(__dirname, 'screenshot.jpg');

let browser, page;

async function run() {
  freeport(async (err, proxyPort) => {
    if (err) {
      console.error('Error finding free port:', err);
      return;
    }

    const proxyServer = new ProxyChain.Server({ port: proxyPort });

    proxyServer.listen(async () => {
      browser = await puppeteer.launch({
        headless: false,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
        ignoreHTTPSErrors: true,
        args: [
          '--ignore-certificate-errors',
          '--disable-gpu',
          '--disable-software-rasterizer',
          '--disable-dev-shm-usage',
          '--no-sandbox',
          `--proxy-server=127.0.0.1:${proxyPort}`
        ]
      });

      page = await browser.newPage();
      await page.setUserAgent("Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_5_7;en-us) AppleWebKit/530.17 (KHTML, like Gecko) Version/4.0 Safari/530.17");

      const cookies = JSON.parse(fs.readFileSync('cookies.json', 'utf8'));
      await page.setCookie(...cookies);

      await page.goto('https://github.com', { waitUntil: 'networkidle2' });

      const refreshInterval = 30000;
      const urlToRefresh = 'https://github.com/codespaces/fluffy-parakeet-7v4v677gj752vwj';

      setInterval(async () => {
        await page.goto(urlToRefresh, { waitUntil: 'networkidle2' });
        await page.screenshot({ path: screenshotPath, type: 'jpeg' });
      }, refreshInterval);

      app.get('/ss', async (req, res) => {
        try {
          res.sendFile(screenshotPath);
        } catch (err) {
          console.error('Error sending screenshot:', err);
          res.status(500).send('Error sending screenshot');
        }
      });

      app.listen(port, () => {
        console.log(`Express server listening on port ${port}`);
      });

      console.log('Browser is running. Press Ctrl+C to exit.');
    });
  });
}

run();
