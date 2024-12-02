import Config from '../Config';
import EncryptUtil from './EncryptUtil';
// import { Logger } from '@lumel/valq-engine/dist/Debug/Logger';
const logger = require('../../build/logger.mjs');

class OnlineTrialLicenseFetcher {
  public fetch(): Promise<string> {
    return new Promise<string>((resolve) => {
      const payload: RequestInit = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signedMsg: EncryptUtil.encrypt(
            JSON.stringify({
              tenantId: Config.TENANT_ID,
              product: 'valq',
              expiry: Math.floor(Date.now() / 1000 + 300),
            })
          ),
        }),
      };
      fetch(Config.LICENSE_URL, payload)
        .then((response) => response.json())
        .then((data) => {
          if (data && data.payload) {
            resolve(data.payload);
          } else {
            resolve(Config.LICENSE_KEY);
          }
        })
        .catch((err) => {
          logger('online.trial.license.fetch.error ' + err, 'error')
          // Logger.error('online.trial.license.fetch.error ' + err);
          resolve(Config.LICENSE_KEY);
        });
    });
  }
}

export default new OnlineTrialLicenseFetcher();
