import { fileURLToPath } from 'node:url';
import config from './config.js';
import { createApp } from './app.js';

const app = createApp({ staticDir: fileURLToPath(new URL('../dist', import.meta.url)) });
setInterval(app.cleanup, 60000).unref();

app.listen(config.port, () => {
  console.log(`Mousalla running on http://localhost:${config.port}`);
});
