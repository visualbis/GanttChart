import { LicenseState, Licensor } from './Licensor';
import LicenseManager from './LicenseManager';
import { Utils } from '../Utils';

export class ReportLicenseManager extends LicenseManager {
  private static instance: ReportLicenseManager;

  public constructor() {
    super();
    if (ReportLicenseManager.instance) {
      return ReportLicenseManager.instance;
    }
    ReportLicenseManager.instance = this;
  }

  public isMatchingLicenseType(): boolean {
    const licensor: Licensor = this.getLicensor();
    const reportLicense = licensor.getStoredReportLicense();
    const isMatchingType: boolean =
      !Utils.isEmpty(reportLicense) &&
      typeof reportLicense.expiry === 'number' &&
      reportLicense.btype === 300;
    return isMatchingType;
  }

  public isValid(): Promise<LicenseState[]> {
    return new Promise<LicenseState[]>((resolve) => {
      const licensor: Licensor = this.getLicensor();
      const reportLicense = licensor.getStoredReportLicense();
      const visualCurrentDate: Date = licensor.getVisualCurrentDate();
      const isValidLicense: boolean =
        !Utils.isEmpty(reportLicense) &&
        typeof reportLicense.expiry === 'number' &&
        reportLicense.expiry * 1000 > visualCurrentDate.getTime() &&
        reportLicense.btype === 300;
      licensor.setFreeLicensePlan(true);
      if (isValidLicense) {
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
    return 'ReportLicenseManager';
  }
}

export default new ReportLicenseManager();
