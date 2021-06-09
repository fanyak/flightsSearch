import express from 'express';
import puppeteer from 'puppeteer';
import { cookiesConsentRedirect, getCurrentDateString, parseResponse } from './utils.mjs';
import fs from 'fs';

const router = express.Router();

router.route('/')
  .get(async (req, res) => {
    let count = 0;
    const result = [];
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
        });
    } else {
      startPromise = Promise.resolve();
    }
    try {
      await startPromise
        .then((_) => {
          const textSelectorFrom = 'div[role="search"] input[type="text"][role="combobox"][value]';
          const textSelectorTo = 'div[role="search"] input[type="text"][role="combobox"][placeholder]';
          // REF: https://pptr.dev/#?product=Puppeteer&version=v9.1.1&show=api-class-page
          return Promise.all([
            page.mainFrame().waitForSelector(textSelectorFrom),
            page.mainFrame().waitForSelector(textSelectorTo),
          ]).then((_) => page.type(textSelectorFrom, 'Thessaloniki'))
            .then((_) => page.keyboard.press('Tab'))
            .then((_) => page.type(textSelectorTo, 'Austin, Texas'))
            .then((_) => page.keyboard.press('Tab'));
        })
        .then(async (_) => {
          const startDateSelector = `div[data-iso="${getCurrentDateString()}"]`;
          const modalSelector = 'div[role="dialog"][aria-modal="true"][style]';
          return Promise.all([
            page.mainFrame().waitForSelector(modalSelector),
            page.mainFrame().waitForSelector(startDateSelector)
          ]).then((_) => page.click(startDateSelector))
            .then((_) => page.keyboard.press('Tab'));
        })
        .then((_) => {
        // const imgSelector = 'img[src="//www.gstatic.com/flights/app/2x/ic_graph_56dp.png"]';
          const xpath = '//button[contains(., "Price graph")]';
          // const output = fs.createWriteStream('example.com_index.html');

          const requestPromise = Promise.resolve({
            then: async function (onFulfill, onReject) {
              let initialRequest = true;
              await page.setRequestInterception(true);

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
                  const calendarUrl = 'https://www.google.com/_/TravelFrontendUi/data/';
                  if (res.url().match(new RegExp(`${calendarUrl}`, 'i'))) {
                    console.log(res.url(), res.status());
                    const response = await res.text();
                    fs.writeFile('buffer.txt', JSON.stringify(response), err => {
                      if (err) {
                        throw (err);
                      }
                    // file written successfully
                    });
                    const resParsed = parseResponse(response);
                    console.log(resParsed);
                    result.push(...resParsed);
                    count += resParsed.length;

                    if (count > 100) {
                      onFulfill(result);
                    } else {
                      const nextButton = 'div[role="dialog"][aria-modal="true"] button[aria-label="Scroll forward"]';
                      try {
                        await page.mainFrame()
                          .waitForSelector(nextButton)
                          .then((_) => page.click(nextButton));
                      } catch (err) {
                        console.log(err);
                      }
                    }
                  }
                } catch (err) {
                  console.error(err);
                  onReject(result);
                }
              });
            }
          });

          return page
            .mainFrame()
            .waitForXPath(xpath)
            .then((button) => button.click())
            .then((_) => requestPromise);
        })
        .then((response) => {
          browser.close();
          res.status(200).send(JSON.stringify(response));
        }, (response) => {
          res.status(206).send(JSON.stringify(response));
        });
    } catch (err) {
      console.error(11, err);
      res.status(400).send(JSON.stringify(result));
    }
  });

export { router };
