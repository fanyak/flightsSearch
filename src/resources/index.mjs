import express from 'express';
import { connect, typeRoute, typeDates, makeRequests } from './puppeteer.mjs';
import { getCurrentDateString, parseResponse } from './utils.mjs';
import { literals } from './literals.mjs';

const router = express.Router();

router.route('/')
  .post(async (req, res) => {
    console.log(req.body);
    const { xpath } = literals;
    let browserInstance;

    try {
      const { page, browser } = await connect();
      browserInstance = browser;
      await typeRoute(page, req);
      await typeDates(page);
      await page
        .mainFrame()
        .waitForXPath(xpath)
        .then((button) => makeRequests(page, button))
        .then((response) => {
          res.status(200).send(JSON.stringify(response));
        }, (response) => { // this catches the rejection from makeRequests
          console.log(response);
          res.status(206).send(JSON.stringify(response));
        });
    } catch (er) { // this catches the try in this pages
      res.status(400).send(JSON.stringify([]));
    } finally {
      browserInstance.close();
    }
  });

export { router };
