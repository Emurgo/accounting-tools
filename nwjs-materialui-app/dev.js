import myReactSinglePageApp from './public/index.html';
import { fetchCopperWalletDataBackend } from './src/api/copper';
import proxyBinanceApi from './src/api/binanceProxy';

Bun.serve({
  hostname: '0.0.0.0',
  port: 3000,
  tls: {
    // generated using https://www.samltool.com/self_signed_certs.php
    key: Bun.file("./key.pem"),
    cert: Bun.file("./cert.pem"),
  },
  routes: {
    '/copperWalletDataProxy': fetchCopperWalletDataBackend,
    "/*": myReactSinglePageApp,
    '/binance/*': proxyBinanceApi,
  },
  env: 'inline',
});
