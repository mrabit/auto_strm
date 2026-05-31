import './logger';
import { startServer } from './server';
import { errorMessage } from './utils';

process.on('uncaughtException', (err) => {
  console.error('[fatal] uncaught exception:', err.message || err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error(
    '[fatal] unhandled rejection:',
    reason instanceof Error ? reason.message : String(reason),
  );
});

const webPort = parseInt(process.env.WEB_PORT || '', 10);
if (webPort <= 0) {
  console.error('WEB_PORT must be set to a positive number');
  process.exit(1);
}

async function main() {
  const { server, close } = await startServer(webPort);

  let shuttingDown = false;

  function shutdown(signal: string) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\nreceived ${signal}, shutting down...`);

    close();

    if (process.env.NODE_ENV === 'development') {
      console.log('dev mode, exiting immediately');
      setTimeout(() => process.exit(0), 100);
      return;
    }

    setTimeout(() => {
      console.log('shutdown timeout — force exit');
      process.exit(1);
    }, 5_000);

    server.on('close', () => {
      console.log('server closed, exiting');
      process.exit(0);
    });
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('failed to start:', errorMessage(err));
  process.exit(1);
});
