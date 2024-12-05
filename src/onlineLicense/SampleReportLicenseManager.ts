import licensor, { LicenseState, Licensor } from './Licensor';
import LicenseManager from './LicenseManager';
import { Utils } from '../Utils';

export class SampleReportLicenseManager extends LicenseManager {
  private static instance: SampleReportLicenseManager;

  public constructor() {
    super();
    if (SampleReportLicenseManager.instance) {
      return SampleReportLicenseManager.instance;
    }
    SampleReportLicenseManager.instance = this;
  }

  public static isSampleReportToggleEnabled(): boolean {
    const offlineLicense = licensor.getStoredOfflineLicense();
    const visualCurrentDate: Date = licensor.getVisualCurrentDate();
    const isToggleEnabled: boolean =
      !Utils.isEmpty(offlineLicense) &&
      typeof offlineLicense.expiry === 'number' &&
      offlineLicense.expiry * 1000 > visualCurrentDate.getTime() &&
      offlineLicense.btype === 200;
    return isToggleEnabled;
  }

  public isMatchingLicenseType(): boolean {
    return this.getLicensor().getStoredIsSampleReport();
  }

  public isValid(): Promise<LicenseState[]> {
    return new Promise<LicenseState[]>((resolve) => {
      const isSampleReport: boolean = this.getLicensor().getStoredIsSampleReport();
      if (isSampleReport) {
        resolve([LicenseState.Valid]);
      } else {
        resolve([LicenseState.Blocked]);
      }
    });
  }

  public update(): Promise<void> {
    const promiseFunc = async (resolve) => {
      const licensors: Licensor = this.getLicensor();
      const viewMode: powerbi.ViewMode = licensors.getViewMode();
      const isSampleReport: boolean = licensors.getStoredIsSampleReport();
      const isModelChange: boolean = licensors.isModelChanged();
      const isEditMode =
        viewMode === powerbi.ViewMode.Edit || viewMode === powerbi.ViewMode.InFocusEdit;

      if (isEditMode && isSampleReport && isModelChange) {
        licensors.setModelChanged(false);
        licensors.persist({ isSampleReport: false });
      } else if (isEditMode && isSampleReport) {
        licensors.setCurrentAppSourceLicense(null);
        licensors.setPreviousAppSourceLicense(null);
        licensors.persist({
          modelCreationDate: null,
          offlineLicense: null,
          appSourceLicense: null,
          tenantLicense: null,
        });
      }
      resolve();
    };

    return new Promise<void>(promiseFunc);
  }

  public getName(): string {
    return 'SampleReportLicenseManager';
  }
}

export default new SampleReportLicenseManager();
