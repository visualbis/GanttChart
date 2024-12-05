// @ifdef isOnlineTrialLicense
import OnlineTrialLicenseFetcher from './OnlineTrialLicenseFetcher';
// @endif
import { LicenseState } from './Licensor';
import LicenseManager from './LicenseManager';
import Config from '../Config';
import { EnvVariables } from './EnvVariables';
import EncryptUtil from './EncryptUtil';
import { EXPIRY_ALERT_DAYS, BuildType } from './Constants';
import { isEqual } from 'lodash';
import { Utils } from '../Utils';

export interface ITenantLicense {
  expiryAlert: boolean;
  buildType: BuildType;
  status: 10 | 20;
  trial: boolean;
  expiry: number;
  subscriptionId: string;
  features: {
    [key: string]: 0 | 1;
  };
}

export class OnlineTrialLicenseManager extends LicenseManager {
  private static instance: OnlineTrialLicenseManager;
  private serviceReplyPromise: Promise<string>;

  public constructor() {
    super();
    if (OnlineTrialLicenseManager.instance) {
      return OnlineTrialLicenseManager.instance;
    }
    OnlineTrialLicenseManager.instance = this;
    this.serviceReplyPromise = null;
  }

  private getServicePlans(): Promise<string> {
    if (this.serviceReplyPromise === null) {
      let promiseResult = new Promise<string>((resolve) => resolve(null));
      // @ifdef isOnlineTrialLicense
      promiseResult = OnlineTrialLicenseFetcher.fetch();
      // @endif
      this.serviceReplyPromise = promiseResult;
    }
    return this.serviceReplyPromise;
  }

  private getFeaturesValidationStatus(license: ITenantLicense): LicenseState[] {
    const result: LicenseState[] = [];
    if (
      EnvVariables.isReportServer &&
      typeof license.features.reportServer !== 'undefined' &&
      !license.features.reportServer
    ) {
      // License needed for report server
      result.push(LicenseState.SubscriptionForReportServerAlert);
    } else if (
      EnvVariables.isEmbeddedReport &&
      typeof license.features.embeddedReport !== 'undefined' &&
      !license.features.embeddedReport
    ) {
      // License needed for embedded report
      result.push(LicenseState.SubscriptionForEmbeddedReportAlert);
    } else if (
      EnvVariables.isPowerBIService &&
      typeof license.features.powerbiService !== 'undefined' &&
      !license.features.powerbiService
    ) {
      // License needed for powerbi service
      result.push(LicenseState.SubscriptionForPowerBiServiceAlert);
    }
    return result;
  }

  public isMatchingLicenseType(): boolean {
    return EnvVariables.isOnlineTrialLicense;
  }

  public isValid(): Promise<LicenseState[]> {
    return new Promise<LicenseState[]>((resolve, reject) => {
      const currentDate = new Date(Date.now());
      const expiryAlertDate = new Date(currentDate);
      expiryAlertDate.setDate(expiryAlertDate.getDate() + EXPIRY_ALERT_DAYS);
      this.getLicensor().setFreeLicensePlan(false);
      this.getLicensor().setVisualCurrentDate(currentDate);
      const doBlockUser = () => {
        this.getLicensor().setFreeLicensePlan(true);
        const viewMode = this.getLicensor().getViewMode();
        const isEditMode =
          viewMode === powerbi.ViewMode.Edit || viewMode === powerbi.ViewMode.InFocusEdit;
        if (isEditMode || EnvVariables.isReportServer || EnvVariables.isEmbeddedReport) {
          resolve([LicenseState.TenantBlocked]);
        } else {
          resolve([LicenseState.Blocked]);
        }
      };
      if (EnvVariables.isOnlineTrialLicense) {
        this.getServicePlans()
          .then((serviceResponse: string) => {
            if (Utils.isEmpty(serviceResponse)) {
              doBlockUser();
            } else {
              const license: ITenantLicense = EncryptUtil.parse(serviceResponse);
              if (
                !license ||
                (license.buildType !== Config.BUILD_TYPE && !license.features[Config.BUILD_TYPE]) ||
                ![10].includes(license.status)
              ) {
                // If license is empty or not respect to this build or product
                doBlockUser();
              } else {
                // Acceptable tenant license
                this.getLicensor().setTenantLicense(license);
                if (license && license.trial && license.expiryAlert) {
                  // Trial with expiry alert from service response
                  const featureStatus: LicenseState[] = this.getFeaturesValidationStatus(license);
                  if (featureStatus.length > 0) {
                    resolve(featureStatus);
                  } else {
                    resolve([LicenseState.TrialValidWithExpiryAlert]);
                  }
                } else if (license && !license.trial && license.expiryAlert) {
                  // Subscription with expiry alert from service response
                  const featureStatus: LicenseState[] = this.getFeaturesValidationStatus(license);
                  if (featureStatus.length > 0) {
                    resolve(featureStatus);
                  } else {
                    resolve([LicenseState.SubscriptionValidWithExpiryAlert]);
                  }
                } else if (
                  license &&
                  license.trial &&
                  typeof license.expiry === 'number' &&
                  license.expiry * 1000 > currentDate.getTime() &&
                  license.expiry * 1000 < expiryAlertDate.getTime()
                ) {
                  // Trial with expiry alert
                  const featureStatus: LicenseState[] = this.getFeaturesValidationStatus(license);
                  if (featureStatus.length > 0) {
                    resolve(featureStatus);
                  } else {
                    resolve([LicenseState.TrialValidWithExpiryAlert]);
                  }
                } else if (
                  license &&
                  license.trial &&
                  typeof license.expiry === 'number' &&
                  license.expiry * 1000 < currentDate.getTime()
                ) {
                  // Trial license expired
                  resolve([LicenseState.TrialExpiredAlert]);
                } else if (
                  license &&
                  !license.trial &&
                  typeof license.expiry === 'number' &&
                  license.expiry * 1000 < currentDate.getTime()
                ) {
                  // Subscription license expired
                  resolve([LicenseState.SubscriptionExpiredAlert]);
                } else {
                  const featureStatus: LicenseState[] = this.getFeaturesValidationStatus(license);
                  if (featureStatus.length > 0) {
                    resolve(featureStatus);
                  } else {
                    // Valid tenant license
                    resolve([LicenseState.Valid]);
                  }
                }
              }
            }
          })
          .catch(reject);
      } else {
        doBlockUser();
      }
    });
  }

  public update(): Promise<void> {
    const promiseFunc = async (resolve, reject) => {
      const licensor = this.getLicensor();
      const viewMode = licensor.getViewMode();
      const storedTenantLicense = licensor.getStoredTenantLicense();
      const tenantLicenseKey: string = await this.getServicePlans().catch(reject);
      const tenantLicense: ITenantLicense = EncryptUtil.parse(tenantLicenseKey);
      const isEditMode =
        viewMode === powerbi.ViewMode.Edit || viewMode === powerbi.ViewMode.InFocusEdit;
      if (
        isEditMode &&
        tenantLicense &&
        (!storedTenantLicense ||
          !isEqual(tenantLicense, storedTenantLicense) ||
          licensor.isViewModeChanged())
      ) {
        licensor.persist({ tenantLicense });
      }
      resolve();
    };

    return new Promise<void>(promiseFunc);
  }

  public getName(): string {
    return 'OnlineTrialLicenseManager';
  }
}

export default new OnlineTrialLicenseManager();
