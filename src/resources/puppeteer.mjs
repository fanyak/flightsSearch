import puppeteer from 'puppeteer';
import { cookiesConsentRedirect, parseResponse } from './utils.mjs';
import { literals } from './literals.mjs';
import fs from 'fs';

async function connect () {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  const response = await page.goto('https://www.google.com/travel/flights?hl=en');
  // the page redirects of Cookies consent in EU countries;
  const chain = response.request().redirectChain();
  let startPromise;

  if (chain.length) {
    const redirectUrl = page.mainFrame().url();
    startPromise = cookiesConsentRedirect(redirectUrl)
      .then((consentUrl) => {
        return Promise.all([// REF: https://github.com/puppeteer/puppeteer/blob/v9.1.1/docs/api.md#framewaitfornavigationoptions
          page.waitForNavigation(), // The promise resolves after navigation has finished
          page.click(`form[action="${consentUrl}/s"] button`), // Clicking the link will indirectly cause a navigation
        ]);
      })
      .then((_) => ({ page, browser }));
  } else {
    startPromise = Promise.resolve({ page, browser });
  }
  return startPromise;
}

async function typeRoute (page, req) {
  const { textSelectorFrom, textSelectorTo } = literals;
  const { from, to } = req.body;
  // REF: https://pptr.dev/#?product=Puppeteer&version=v9.1.1&show=api-class-page
  return Promise.all([
    page.mainFrame().waitForSelector(textSelectorFrom),
    page.mainFrame().waitForSelector(textSelectorTo),
  ]).then((_) => page.type(textSelectorFrom, from))
    .then((_) => page.keyboard.press('Tab'))
    .then((_) => page.type(textSelectorTo, to))
    .then((_) => page.keyboard.press('Tab'));
}

async function typeDates (page) {
  const { startDateSelector, modalSelector } = literals;
  return Promise.all([
    page.mainFrame().waitForSelector(modalSelector),
    page.mainFrame().waitForSelector(startDateSelector)
  ]).then((_) => page.click(startDateSelector))
    .then((_) => page.keyboard.press('Tab'));
}

async function makeRequests (page, button) {
  // const imgSelector = 'img[src="//www.gstatic.com/flights/app/2x/ic_graph_56dp.png"]';
  // const output = fs.createWriteStream('example.com_index.html');

  return Promise.resolve({
    then: async function (onFulfill, onReject) {
      let initialRequest = true;
      let count = 0;
      const result = [];

      try {
        await page.setRequestInterception(true)
          .then((_) => {
            page.on('request', request => {
            // cancel any navigation requests after the initial page.goto
              if (request.isNavigationRequest() && !initialRequest) {
                return request.abort();
              }
              initialRequest = false;
              request.continue();
            });

            page.on('response', async (res) => {
              try {
                const { calendarUrl } = literals;
                const url = res.url();
                if (url && url.match(new RegExp(`${calendarUrl}`, 'i'))) {
                  console.log(url, res.status());
                  const response = await res.text();
                  fs.writeFile('buffer.txt', JSON.stringify(response), err => {
                    if (err) {
                      throw (err);
                    }
                    // file written successfully
                  });
                  const resParsed = parseResponse(response);
                  console.log(response, resParsed);
                  result.push(...resParsed);
                  count += resParsed.length;

                  if (count > 100) {
                    onFulfill(result);
                  } else {
                    const { nextButton } = literals;
                    await page.mainFrame()
                      .waitForSelector(nextButton)
                      .then((_) => page.click(nextButton));
                  }
                }
              } catch (err) {
                console.error(11, result, err);// @TODO
                onReject(result);
              }
            });
            button.click();
          });
      } catch (er) {
        console.log(222, er);
      }
    }
  });
}

export { connect, typeRoute, typeDates, makeRequests };
