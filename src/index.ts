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

const webPort = parseInt(process.env.WEB_PORT || '3000', 10);
if (isNaN(webPort) || webPort <= 0) {
  console.error('WEB_PORT 必须设置为正整数');
  process.exit(1);
}

async function main() {
  const { server, close } = await startServer(webPort);

  let shuttingDown = false;

  function shutdown(signal: string) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\n收到 ${signal}，正在关闭...`);

    close();

    if (process.env.NODE_ENV === 'development') {
      console.log('开发模式，立即退出');
      setTimeout(() => process.exit(0), 100);
      return;
    }

    setTimeout(() => {
      console.log('关闭超时 — 强制退出');
      process.exit(1);
    }, 5_000);

    server.on('close', () => {
      console.log('服务器已关闭，退出');
      process.exit(0);
    });
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('启动失败:', errorMessage(err));
  process.exit(1);
});
