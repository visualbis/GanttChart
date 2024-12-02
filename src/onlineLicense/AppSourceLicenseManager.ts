import powerbi from 'powerbi-visuals-api';
import IVisualLicenseManager = powerbi.extensibility.IVisualLicenseManager;
import LicenseInfoResult = powerbi.extensibility.visual.LicenseInfoResult;
import ServicePlanState = powerbi.ServicePlanState;
import ServicePlan = powerbi.extensibility.visual.ServicePlan;
import LicenseManager from './LicenseManager';
import { isEqual } from 'lodash';
import { EnvVariables } from './EnvVariables';
import {
  BuildType,
  BUILD_TYPES,
  IPlanConfig,
  LICENSE_ENV,
  PLAN_CONFIG_LIST,
  EXPIRY_ALERT_DAYS,
  EXPIRY_DAYS,
  PLAN_NAMES,
} from './Constants';
import Config from '../Config';
import { LicenseState, ILicense } from './Licensor';
// @ifdef isMockLicense
import AppSourceLicenseMockup from './AppSourceLicenseMockup';
// @endif
// import { Logger } from '@lumel/valq-engine/dist/Debug/Logger';
import { Utils } from '../Utils';
const logger = require('../../build/logger.mjs');

export interface IAppSourceLicense {
  plan: string;
  status: ServicePlanState;
  unlimitedViewerEnvs: LICENSE_ENV[];
  buildType: BuildType;
  priority: number;
}

interface IServicePlanResponse {
  appSourceLicense: IAppSourceLicense;
  currentDate: Date;
}

interface IPowerBiServicePlanResponse {
  licenseInfoResult: LicenseInfoResult;
  currentDate: Date;
}

interface IValidationContext {
  activeLicense: IAppSourceLicense;
  storedAppSourceLicense: IAppSourceLicense;
  storedOfflineLicense: ILicense;
  isEditMode: boolean;
  isFreeTimeExceed: boolean;
  isFreeTimeWithoutWarningExceed: boolean;
}

export class AppSourceLicenseManager extends LicenseManager {
  private static instance: AppSourceLicenseManager;
  private serviceReplyPromise: Promise<IPowerBiServicePlanResponse>;

  public constructor() {
    super();
    if (AppSourceLicenseManager.instance) {
      return AppSourceLicenseManager.instance;
    }
    AppSourceLicenseManager.instance = this;
    this.serviceReplyPromise = null;
  }

  private isNoLicensePlanAvailable(licenseInfoResult: LicenseInfoResult): boolean {
    const { plans, isLicenseUnsupportedEnv } = licenseInfoResult;
    const activePlans = (plans || []).filter(
      (plan) => plan.state === ServicePlanState.Active || plan.state === ServicePlanState.Warning
    );
    return isLicenseUnsupportedEnv || activePlans.length === 0;
  }

  private hasMatchingPlan(licenseInfoResult: LicenseInfoResult): boolean {
    const { plans } = licenseInfoResult;
    const activePlans = (plans || []).filter(
      (plan) => plan.state === ServicePlanState.Active || plan.state === ServicePlanState.Warning
    );
    return PLAN_CONFIG_LIST.some((planConfig: IPlanConfig) => {
      return activePlans.some(({ spIdentifier }) => planConfig.regex.test(spIdentifier));
    });
  }

  private getDefaultAppSourceLicense(currentDate: Date): {
    appSourceLicense: IAppSourceLicense;
    currentDate: Date;
  } {
    return {
      appSourceLicense: {
        plan: PLAN_NAMES.FREE_PLAN,
        status: ServicePlanState.Unknown,
        unlimitedViewerEnvs: [],
        buildType: <BuildType>Config.BUILD_TYPE,
        priority: -1,
      },
      currentDate,
    };
  }

  private getDefaultPlanConfig(): IPlanConfig {
    return {
      regex: null,
      plan: PLAN_NAMES.FREE_PLAN,
      buildType: <BuildType>Config.BUILD_TYPE,
      priority: -1,
    };
  }

  private getDefaultPlan(licenseInfoResult: LicenseInfoResult): ServicePlan {
    const { plans } = licenseInfoResult;
    const activePlans = (plans || []).filter(
      (plan) => plan.state === ServicePlanState.Active || plan.state === ServicePlanState.Warning
    );
    return activePlans.length ? activePlans[0] : null;
  }

  private getActiveMatchingAppSourceLicense(
    licenseInfoResult: LicenseInfoResult,
    currentDate: Date
  ): { appSourceLicense: IAppSourceLicense; currentDate: Date } {
    const { plans } = licenseInfoResult;
    const activePlans = (plans || []).filter(
      (plan) => plan.state === ServicePlanState.Active || plan.state === ServicePlanState.Warning
    );
    let activePlanConfig: IPlanConfig = this.getDefaultPlanConfig();
    let activePlan = this.getDefaultPlan(licenseInfoResult);
    const unlimitedViewerEnvs: LICENSE_ENV[] = [];
    PLAN_CONFIG_LIST.forEach((planConfig) => {
      const matchedPlan = activePlans.find(({ spIdentifier }) =>
        planConfig.regex.test(spIdentifier)
      );
      if (matchedPlan) {
        activePlan = matchedPlan;
        activePlanConfig = planConfig;
        if (planConfig.unlimitedViewerEnvs) {
          unlimitedViewerEnvs.push(...planConfig.unlimitedViewerEnvs);
        }
      }
    });
    return {
      appSourceLicense: {
        plan: activePlanConfig.plan,
        unlimitedViewerEnvs,
        status: activePlan.state,
        buildType: activePlanConfig.buildType,
        priority: activePlanConfig.priority,
      },
      currentDate,
    };
  }

  private getPowerBiServicePlans(
    licenseManager: IVisualLicenseManager
  ): Promise<IPowerBiServicePlanResponse> {
    const promiseFunc = async (resolve, reject) => {
      const result: LicenseInfoResult = <LicenseInfoResult>(
        await licenseManager.getAvailableServicePlans().catch(reject)
      );
      resolve({
        licenseInfoResult: result,
        currentDate: new Date(Date.now()),
      });
    };

    return new Promise(promiseFunc);
  }

  private getServicePlans(licenseManager: IVisualLicenseManager): Promise<IServicePlanResponse> {
    const promiseFunc = async (resolve) => {
      if (this.serviceReplyPromise === null) {
        let promiseResult: Promise<IPowerBiServicePlanResponse> =
          this.getPowerBiServicePlans(licenseManager);
        // @ifdef isMockLicense
        promiseResult = EnvVariables.isMockLicense
          ? AppSourceLicenseMockup.apply(
            EnvVariables.isEmbeddedReport || EnvVariables.isReportServer
          )
          : promiseResult;
        // @endif
        this.serviceReplyPromise = promiseResult;
      }
      const { licenseInfoResult, currentDate }: IPowerBiServicePlanResponse = <
        IPowerBiServicePlanResponse
        >await this.serviceReplyPromise.catch((err) => {
          logger('license.service.error ' + err, 'error')
          // Logger.error('license.service.error ' + err);
          resolve(this.getDefaultAppSourceLicense(new Date(Date.now())));
        });
      this.getLicensor().setUserLicensePlans(licenseInfoResult.plans);
      if (this.isNoLicensePlanAvailable(licenseInfoResult)) {
        resolve(this.getDefaultAppSourceLicense(currentDate));
      } else if (this.hasMatchingPlan(licenseInfoResult)) {
        resolve(this.getActiveMatchingAppSourceLicense(licenseInfoResult, currentDate));
      } else {
        resolve(this.getDefaultAppSourceLicense(currentDate));
      }
    };

    return new Promise(promiseFunc);
  }

  private getActiveLicense(
    isEditMode: boolean,
    appSourceLicense: IAppSourceLicense,
    storedAppSourceLicense: IAppSourceLicense
  ): IAppSourceLicense {
    if (
      !isEditMode &&
      storedAppSourceLicense &&
      storedAppSourceLicense.plan !== PLAN_NAMES.FREE_PLAN
    ) {
      const unlimitedViewerEnvs = storedAppSourceLicense.unlimitedViewerEnvs || [];
      if (
        (EnvVariables.isEmbeddedReport && unlimitedViewerEnvs.includes(LICENSE_ENV.EMBEDDED)) ||
        (EnvVariables.isReportServer && unlimitedViewerEnvs.includes(LICENSE_ENV.REPORT_SERVER)) ||
        (EnvVariables.isPowerBIService && unlimitedViewerEnvs.includes(LICENSE_ENV.POWERBI_SERVICE))
      ) {
        return storedAppSourceLicense;
      }
    }
    if (appSourceLicense?.plan === PLAN_NAMES.FREE_PLAN) {
      return null;
    }
    return appSourceLicense;
  }

  private getValidationContext(
    currentDate: Date,
    appSourceLicense: IAppSourceLicense
  ): IValidationContext {
    const licensor = this.getLicensor();
    const viewMode = licensor.getViewMode();
    const isEditMode =
      viewMode === powerbi.ViewMode.Edit || viewMode === powerbi.ViewMode.InFocusEdit;
    const storedLicense = licensor.getStoredLicense();
    const storedAppSourceLicense = storedLicense ? storedLicense.appSourceLicense : null;
    const storedOfflineLicense = storedLicense ? storedLicense.offlineLicense : null;
    const storedModelCreationDate = storedLicense ? storedLicense.modelCreationDate : null;
    const modelCreationDate = Utils.isEmpty(storedModelCreationDate)
      ? currentDate
      : storedModelCreationDate;
    const modelExpiryDate = new Date(modelCreationDate);
    modelExpiryDate.setDate(modelExpiryDate.getDate() + EXPIRY_DAYS);
    const modelExpiryWarningDate = new Date(modelExpiryDate);
    modelExpiryWarningDate.setDate(modelExpiryWarningDate.getDate() - EXPIRY_ALERT_DAYS);
    const isFreeTimeExceed = modelExpiryDate.getTime() < currentDate.getTime();
    const isFreeTimeWithoutWarningExceed =
      !isFreeTimeExceed && modelExpiryWarningDate.getTime() < currentDate.getTime();
    const activeLicense: IAppSourceLicense = this.getActiveLicense(
      isEditMode,
      appSourceLicense,
      storedAppSourceLicense
    );
    return {
      activeLicense,
      storedAppSourceLicense,
      storedOfflineLicense,
      isEditMode,
      isFreeTimeExceed,
      isFreeTimeWithoutWarningExceed,
    };
  }

  private getActiveLicenseStates(validationContext: IValidationContext): LicenseState[] {
    const {
      activeLicense,
      storedAppSourceLicense,
      isEditMode,
      isFreeTimeExceed,
      isFreeTimeWithoutWarningExceed,
    } = validationContext;

    if (!activeLicense) {
      this.getLicensor().setFreeLicensePlan(true);
      // User has no active license
      if (isEditMode) {
        // User in edit mode
        if (isFreeTimeExceed) {
          // User is in edit mode and has no active license and exceed free time limit, so show license notification
          return [LicenseState.Upgrade, LicenseState.RepetitiveFreeWarning];
        } else if (isFreeTimeWithoutWarningExceed) {
          // User is in edit mode and has no active license and going to exceed the free time limit, so show license notification
          return [LicenseState.Upgrade, LicenseState.ModelExpiryAlert];
        } else {
          // User is in edit mode and has no active license, so show license notification
          return [LicenseState.Upgrade];
        }
      } else {
        // User in read mode
        if (isFreeTimeExceed) {
          // User is in read mode and has no active license and exceed free time limit, so block the visual
          return [LicenseState.Blocked];
        } else {
          // User is in read mode and has no active license and not exceed free time limit, so show license notification
          return [LicenseState.Upgrade];
        }
      }
    } else if (
      activeLicense !== storedAppSourceLicense &&
      activeLicense.status === ServicePlanState.Warning
    ) {
      // Grace period license
      return [LicenseState.ValidWithExpiryAlert];
    } else {
      // User has active license
      return [LicenseState.Valid];
    }
  }

  public isMatchingLicenseType(): boolean {
    return Config.BUILD_TYPE === BUILD_TYPES.PREMIUM && !EnvVariables.isOnlineTrialLicense;
  }

  public isValid(): Promise<LicenseState[]> {
    console.log("🚀 ~ AppSourceLicenseManager ~ isValid ~ isValid:")
    const promiseFunc = async (resolve, reject) => {
      const { licenseManager } = this.getLicensor().getVisualHost();
      const { appSourceLicense, currentDate }: IServicePlanResponse = <IServicePlanResponse>(
        await this.getServicePlans(licenseManager).catch(reject)
      );
      this.getLicensor().setFreeLicensePlan(false);
      this.getLicensor().setVisualCurrentDate(currentDate);
      const validationContext: IValidationContext = this.getValidationContext(
        currentDate,
        appSourceLicense
      );
      const { storedAppSourceLicense, storedOfflineLicense, isEditMode } = validationContext;
      const activeStates: LicenseState[] = this.getActiveLicenseStates(validationContext);
      if (
        isEditMode &&
        appSourceLicense &&
        storedAppSourceLicense &&
        storedAppSourceLicense.plan === PLAN_NAMES.PREMIUM_UNLIMITED_SERVICE_VIEWER &&
        appSourceLicense.plan !== PLAN_NAMES.PREMIUM_UNLIMITED_SERVICE_VIEWER
      ) {
        // Plan downgrade from unlimited licensed version with edit view
        resolve([LicenseState.DowngradedXViewerWarning, ...activeStates]);
      } else if (
        isEditMode &&
        appSourceLicense &&
        storedAppSourceLicense &&
        storedAppSourceLicense.plan !== PLAN_NAMES.FREE_PLAN &&
        appSourceLicense.priority < storedAppSourceLicense.priority
      ) {
        // If new AppsourceLicense is lesser priority plan than the stored plan.
        resolve([LicenseState.DowngradedWarning, ...activeStates]);
      } else if (
        storedOfflineLicense &&
        typeof storedOfflineLicense.expiry === 'number' &&
        storedOfflineLicense.expiry * 1000 > currentDate.getTime() &&
        (!('btype' in storedOfflineLicense) || [100, 200, 300].includes(storedOfflineLicense.btype))
      ) {
        // Valid offline license
        this.getLicensor().setFreeLicensePlan(false);
        const expiryAlertDate = new Date(currentDate);
        expiryAlertDate.setDate(expiryAlertDate.getDate() + EXPIRY_ALERT_DAYS);
        if (
          storedOfflineLicense &&
          typeof storedOfflineLicense.expiry === 'number' &&
          storedOfflineLicense.expiry * 1000 > currentDate.getTime() &&
          storedOfflineLicense.expiry * 1000 < expiryAlertDate.getTime() &&
          (!('btype' in storedOfflineLicense) ||
            [100, 200, 300].includes(storedOfflineLicense.btype))
        ) {
          resolve([LicenseState.ForceValidWithExpiryAlert]);
        } else {
          resolve([LicenseState.Valid]);
        }
      } else {
        resolve(activeStates);
      }
    };

    return new Promise<LicenseState[]>(promiseFunc);
  }

  public update(): Promise<void> {
    const promiseFunc = async (resolve, reject) => {
      const licensor = this.getLicensor();
      const viewMode = licensor.getViewMode();
      const storedAppSourceLicense = licensor.getStoredAppSourceLicense();
      const { licenseManager } = licensor.getVisualHost();
      const { appSourceLicense, currentDate }: IServicePlanResponse = <IServicePlanResponse>(
        await this.getServicePlans(licenseManager).catch(reject)
      );
      const isEditMode =
        viewMode === powerbi.ViewMode.Edit || viewMode === powerbi.ViewMode.InFocusEdit;
      if (
        isEditMode &&
        appSourceLicense &&
        (!storedAppSourceLicense ||
          !isEqual(appSourceLicense, storedAppSourceLicense) ||
          licensor.isViewModeChanged())
      ) {
        licensor.persist({ appSourceLicense, modelCreationDate: currentDate });
      }
      if (!isEqual(appSourceLicense, storedAppSourceLicense)) {
        this.getLicensor().setCurrentAppSourceLicense(appSourceLicense);
        this.getLicensor().setPreviousAppSourceLicense(storedAppSourceLicense);
      }
      if (!this.getLicensor().getPreviousAppSourceLicense()) {
        this.getLicensor().setPreviousAppSourceLicense(storedAppSourceLicense);
      }
      if (!this.getLicensor().getCurrentAppSourceLicense()) {
        this.getLicensor().setCurrentAppSourceLicense(appSourceLicense);
      }
      resolve();
    };

    return new Promise<void>(promiseFunc);
  }

  public getName(): string {
    return 'AppSourceLicenseManager';
  }
}

export default new AppSourceLicenseManager();
