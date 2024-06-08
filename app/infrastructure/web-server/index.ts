import { createApp, toNodeListener } from 'h3';
import { createServer } from 'node:http';
import { initApiRouter } from '@/infrastructure/web-server/api.router';
import { requestStorage } from '@/infrastructure/request-storage';
import { uuidv4 } from 'uuidv7';
import { requestLogger, apiRouter, docsRouter } from '@/infrastructure/web-server/di';
import { initDocsRouter } from '@/infrastructure/web-server/docs/docs.router';
import { appOpenApi } from '@/infrastructure/web-server/open-api.di';

const app = createApp({
  onError: (error, event) => requestLogger.error(error, event),
  onRequest: (event) => requestLogger.request(event),
  onBeforeResponse: (event) => requestLogger.finished(event),
});

initApiRouter(apiRouter);
initDocsRouter(docsRouter, appOpenApi);
app.use(apiRouter);
app.use(docsRouter);

const webServer = createServer((...args) => {
  requestStorage.run(
    {
      requestId: uuidv4(),
    },
    () => {
      toNodeListener(app)(...args);
    },
  );
});

export async function startServer(port: number): Promise<void> {
  return new Promise((res, rej) => {
    webServer.listen(port).on('error', rej).on('listening', res);
  });
}

export async function stopServer(): Promise<void> {
  return new Promise((res, rej) => {
    webServer.close().on('error', rej).on('close', res);
  });
}

// TODO di?
