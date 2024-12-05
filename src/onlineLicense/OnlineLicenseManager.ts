import { LicenseState } from './Licensor';
import LicenseManager from './LicenseManager';
import { BUILD_TYPES } from './Constants';
import Config from '../Config';

export class OnlineLicenseManager extends LicenseManager {
  private static instance: OnlineLicenseManager;

  public constructor() {
    super();
    if (OnlineLicenseManager.instance) {
      return OnlineLicenseManager.instance;
    }
    OnlineLicenseManager.instance = this;
  }

  public isMatchingLicenseType(): boolean {
    return Config.BUILD_TYPE === BUILD_TYPES.ENTERPRISE;
  }

  public isValid(): Promise<LicenseState[]> {
    return new Promise<LicenseState[]>((resolve) => {
      if (Config.BUILD_TYPE === BUILD_TYPES.ENTERPRISE) {
        resolve([LicenseState.Valid]);
      } else {
        resolve([LicenseState.Blocked]);
      }
    });
  }

  public update(): Promise<void> {
    const promiseFunc = async (resolve) => {
      resolve();
    };

    return new Promise<void>(promiseFunc);
  }

  public getName(): string {
    return 'OnlineLicenseManager';
  }
}

export default new OnlineLicenseManager();
