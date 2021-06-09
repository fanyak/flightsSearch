import express from 'express';
// import cors from 'cors'; no need for cors in this application
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { router as flightsRouter } from './src/resources/index.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const port = process.env.port || 3000;

const WEB_PATH = join(__dirname, 'public');

// serve mjs files
const fileServer = express.static(WEB_PATH, { // OPTIONS OBJECT
  setHeaders (res, path) {
    const parts = path.split('.');
    if (parts[parts.length - 1] === 'mjs') {
      // JUST TO MAKE SURE THAT IT IS SERVED AS JAVASCRIPT
      // REF: https://v8.dev/features/modules#mjs
      res.setHeader('Content-Type', 'text/javascript');
    }
  }
});

app.use(fileServer);

app.use('/api/flights/', express.json(), flightsRouter);

app.use((req, res) => res.sendFile(`${WEB_PATH}/index.html`));

app.listen(port, () => {
  console.log('app listening on port 3000');
});
