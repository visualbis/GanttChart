import powerbi from 'powerbi-visuals-api';
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import ViewMode = powerbi.ViewMode;
import LicenseNotificationType = powerbi.LicenseNotificationType;
import LicenseManager from './LicenseManager';
import ServicePlan = powerbi.extensibility.visual.ServicePlan;
import {
  IUserLicensePlan,
  ILicenseInfo,
  LICENSE_DEFAULT,
  ITenantLicensePlan,
} from './helper';
import { IBuildInfo } from './helper';
import { EnvVariables } from './EnvVariables';
import reportLicenseManager from './ReportLicenseManager';
import sampleReportLicenseManager from './SampleReportLicenseManager';
import onlineLicenseManager from './OnlineLicenseManager';
import onlineTrialLicenseManager, { ITenantLicense } from './OnlineTrialLicenseManager';
import appSourceLicenseManager, { IAppSourceLicense } from './AppSourceLicenseManager';
import { EXPIRY_DAYS } from './Constants';
import notifier from './Notifier';
import { IAlertSize } from './Alert';
import { Utils } from '../Utils';
import { EnumerationKeys } from './EnumerationKeys';
import EncryptUtil from './EncryptUtil';
import Config from '../Config';
// import { Logger } from '@lumel/valq-engine/dist/Debug/Logger';
import logger from './logger';

export interface ILicense {
  btype: 100 | 200 | 300;
  expiry: number;
}

export const enum LicenseState {
  Valid = 1,
  Blocked = 2,
  DowngradedXViewerWarning = 3,
  DowngradedWarning = 4,
  Upgrade = 5,
  RepetitiveFreeWarning = 6,
  ModelExpiryAlert = 7,
  ValidWithExpiryAlert = 8,
  ForceValidWithExpiryAlert = 9,
  TrialValidWithExpiryAlert = 10,
  SubscriptionValidWithExpiryAlert = 11,
  TrialExpiredAlert = 12,
  SubscriptionExpiredAlert = 13,
  SubscriptionForReportServerAlert = 14,
  SubscriptionForEmbeddedReportAlert = 15,
  SubscriptionForPowerBiServiceAlert = 16,
  TenantBlocked = 17,
}

export const repetitiveActionStates: LicenseState[] = [
  LicenseState.RepetitiveFreeWarning,
  LicenseState.TrialExpiredAlert,
  LicenseState.SubscriptionExpiredAlert,
  LicenseState.SubscriptionForReportServerAlert,
  LicenseState.SubscriptionForEmbeddedReportAlert,
  LicenseState.SubscriptionForPowerBiServiceAlert,
  LicenseState.TenantBlocked,
  LicenseState.Blocked,
];

export const highPriorityActionStates: LicenseState[] = [
  LicenseState.Blocked,
  LicenseState.Upgrade,
  LicenseState.ValidWithExpiryAlert,
  LicenseState.ForceValidWithExpiryAlert,
];

export const nonCombinableActionStates: LicenseState[] = [LicenseState.Valid];

export interface License {
  reportLicense: ILicense;
  tenantLicense: ITenantLicense;
  offlineLicense: ILicense;
  appSourceLicense: IAppSourceLicense;
  modelCreationDate: Date;
  isSampleReport: boolean;
}

export class Licensor {
  private static instance;
  private visualHost: IVisualHost;
  private viewMode: ViewMode;
  private isViewModeChange: boolean;
  private isModelChange: boolean;
  private visualSettings: any;
  private previousStoredLicense: License;
  private licenseInfo: ILicenseInfo;
  private licenseStates: LicenseState[];
  private visualCurrentDate: Date;
  private onLicenseChange: () => void;
  private previousAppSourceLicense: IAppSourceLicense;
  private currentAppSourceLicense: IAppSourceLicense;
  private validatePromise: Promise<void>;
  private tenantLicense: ITenantLicense;
  private licenseManagerApplied: string;
  private licenseManagers: LicenseManager[];

  public constructor() {
    if (Licensor.instance) {
      return Licensor.instance;
    }
    Licensor.instance = this;
    this.licenseInfo = LICENSE_DEFAULT;
    this.previousStoredLicense = null;
    this.licenseStates = [];
    this.visualCurrentDate = new Date(Date.now());
    this.onLicenseChange = null;
    this.tenantLicense = null;
    this.licenseManagerApplied = null;
  }

  public init(visualHost: IVisualHost): void {
    console.log("🚀 ~ Licensor ~ init ~ init:")
    this.visualHost = visualHost;
    notifier.init(this.visualHost);
    this.licenseManagers = [
      reportLicenseManager,
      sampleReportLicenseManager,
      onlineTrialLicenseManager,
      onlineLicenseManager,
      appSourceLicenseManager,
    ];
    this.licenseManagers.forEach((licenseManager) => {
      licenseManager.init(this);
    });
  }

  public getViewMode(): ViewMode {
    return this.viewMode;
  }

  public isViewModeChanged(): boolean {
    return this.isViewModeChange;
  }

  public isModelChanged(): boolean {
    return this.isModelChange;
  }

  public setModelChanged(isModelChange: boolean): void {
    this.isModelChange = isModelChange;
  }

  public setFreeLicensePlan(isFreePlan: boolean): void {
    this.licenseInfo.isFreeLicensePlan = isFreePlan;
  }

  public setUserLicensePlans(plans: ServicePlan[]): void {
    const infoPlans: IUserLicensePlan[] = plans.map((plan: ServicePlan) => {
      return {
        name: plan.spIdentifier,
        state: EnumerationKeys.getServicePlanStateKey(plan.state),
      };
    });
    this.licenseInfo.plans = infoPlans;
  }

  public getLicenseInfo(): ILicenseInfo {
    return this.licenseInfo;
  }

  public getBuildInfo(): IBuildInfo {
    return {
      buildType: Config.BUILD_TYPE,
      buildEnvironment: Config.BUILD_ENVIRONMENT,
      buildDate: EnvVariables.BUILD_DATE,
      version: EnvVariables.VERSION,
    };
  }

  public getVisualHost(): IVisualHost {
    return this.visualHost;
  }

  public getVisualSettings(): any {
    return this.visualSettings;
  }

  public getPreviousStoredLicense(): License {
    return this.previousStoredLicense;
  }

  public getLicenseStates(): LicenseState[] {
    return this.licenseStates;
  }

  public setVisualCurrentDate(visualCurrentDate: Date): void {
    this.visualCurrentDate = visualCurrentDate;
  }

  public getVisualCurrentDate(): Date {
    return this.visualCurrentDate;
  }

  public onChange(onLicenseChange: () => void) {
    this.onLicenseChange = onLicenseChange;
  }

  public setTenantLicense(tenantLicense: ITenantLicense) {
    this.tenantLicense = tenantLicense;
  }

  public getTenantLicense(): ITenantLicense {
    return this.tenantLicense;
  }

  public setLicenseManagerApplied(licenseManagerApplied: string) {
    this.licenseManagerApplied = licenseManagerApplied;
  }

  public getLicenseManagerApplied(): string {
    return this.licenseManagerApplied;
  }

  public setPreviousAppSourceLicense(previousAppSourceLicense: IAppSourceLicense): void {
    this.previousAppSourceLicense = previousAppSourceLicense;
  }

  public getPreviousAppSourceLicense(): IAppSourceLicense {
    return this.previousAppSourceLicense;
  }

  public setCurrentAppSourceLicense(currentAppSourceLicense: IAppSourceLicense): void {
    this.currentAppSourceLicense = currentAppSourceLicense;
  }

  public getCurrentAppSourceLicense(): IAppSourceLicense {
    return this.currentAppSourceLicense;
  }

  public getStoredAppSourceLicense(): IAppSourceLicense {
    try {
      return this.visualSettings &&
        this.visualSettings.licenseStore.appSourceLicense &&
        !Utils.isEmpty(this.visualSettings.licenseStore.appSourceLicense)
        ? JSON.parse(this.visualSettings.licenseStore.appSourceLicense)
        : null;
    } catch (err) {
      logger('license.app.source.license.parser.error ' + err, 'error');
      // Logger.error('license.app.source.license.parser.error ' + err);
      return null;
    }
  }

  public getStoredTenantLicense(): ITenantLicense {
    try {
      return this.visualSettings &&
        this.visualSettings.licenseStore.tenantLicense &&
        !Utils.isEmpty(this.visualSettings.licenseStore.tenantLicense)
        ? EncryptUtil.parse(this.visualSettings.licenseStore.tenantLicense)
        : null;
    } catch (err) {
      logger('license.tenant.license.parser.error ' + err, 'error');
      // Logger.error('license.tenant.license.parser.error ' + err);
      return null;
    }
  }

  public getStoredReportLicense(): ILicense {
    try {
      return this.visualSettings &&
        this.visualSettings.licenseStore.reportLicense &&
        !Utils.isEmpty(this.visualSettings.licenseStore.reportLicense)
        ? EncryptUtil.parse(this.visualSettings.licenseStore.reportLicense)
        : null;
    } catch (err) {
      logger('license.offline.license.parser.error ' + err, 'error');
      // Logger.error('license.offline.license.parser.error ' + err);
      return null;
    }
  }

  public getStoredOfflineLicense(): ILicense {
    try {
      return this.visualSettings &&
        this.visualSettings.licenseStore.offlineLicense &&
        !Utils.isEmpty(this.visualSettings.licenseStore.offlineLicense)
        ? EncryptUtil.parse(this.visualSettings.licenseStore.offlineLicense)
        : null;
    } catch (err) {
      logger('license.offline.license.parser.error ' + err, 'error');
      // Logger.error('license.offline.license.parser.error ' + err);
      return null;
    }
  }

  public getStoredModelCreationDate(): Date {
    try {
      return this.visualSettings &&
        this.visualSettings.licenseStore.modelCreationDate &&
        !Utils.isEmpty(this.visualSettings.licenseStore.modelCreationDate)
        ? new Date(Date.parse(this.visualSettings.licenseStore.modelCreationDate))
        : null;
    } catch (err) {
      logger('license.creation.date.parser.error ' + err, 'error');
      // Logger.error('license.creation.date.parser.error ' + err);
      return null;
    }
  }

  public getStoredIsSampleReport(): boolean {
    try {
      return this.visualSettings && this.visualSettings.licenseStore.isSampleReport === true
        ? true
        : false;
    } catch (err) {
      logger('license.sample.report.flag.parser.error ' + err, 'error');
      // Logger.error('license.sample.report.flag.parser.error ' + err);
      return false;
    }
  }

  public getStoredLicense(): License {
    try {
      return this.visualSettings &&
        this.visualSettings.licenseStore &&
        !Utils.isEmpty(this.visualSettings.licenseStore) &&
        (!Utils.isEmpty(this.visualSettings.licenseStore.tenantLicense) ||
          !Utils.isEmpty(this.visualSettings.licenseStore.offlineLicense) ||
          !Utils.isEmpty(this.visualSettings.licenseStore.appSourceLicense) ||
          !Utils.isEmpty(this.visualSettings.licenseStore.modelCreationDate) ||
          this.visualSettings.licenseStore.isSampleReport === true)
        ? {
          reportLicense: this.getStoredReportLicense(),
          tenantLicense: this.getStoredTenantLicense(),
          offlineLicense: this.getStoredOfflineLicense(),
          appSourceLicense: this.getStoredAppSourceLicense(),
          modelCreationDate: this.getStoredModelCreationDate(),
          isSampleReport: this.getStoredIsSampleReport(),
        }
        : null;
    } catch (err) {
      logger('license.parser.error ' + err, 'error');
      // Logger.error('license.parser.error ' + err);
      return null;
    }
  }

  private getUserLicensePlan(license: IAppSourceLicense): IUserLicensePlan {
    let result: IUserLicensePlan = {
      name: 'Empty',
      state: 'Empty',
      unlimitedViewerEnvs: [],
      buildType: 'Empty',
      priority: 'Empty',
    };
    if (license) {
      result = {
        name: license.plan,
        state: EnumerationKeys.getServicePlanStateKey(license.status),
        unlimitedViewerEnvs: license.unlimitedViewerEnvs
          ? license.unlimitedViewerEnvs.map((env) => EnumerationKeys.getLicenseEnvKey(env))
          : [],
        buildType: license.buildType,
        priority: license.priority + '',
      };
    }
    return result;
  }

  private getTenantLicensePlan(tenantLicense: ITenantLicense): ITenantLicensePlan {
    const result: ITenantLicensePlan = {
      id: 'Empty',
      subscriptionId: 'Empty',
      licenseExpiryDate: 'Empty',
    };
    if (tenantLicense) {
      if (!Utils.isEmpty(Config.TENANT_ID)) {
        result.id = Config.TENANT_ID;
      }
      if (!Utils.isEmpty(tenantLicense.subscriptionId)) {
        result.subscriptionId = tenantLicense.subscriptionId;
      }
      if (!Utils.isEmpty(tenantLicense.expiry)) {
        const expiryDate: Date = new Date(tenantLicense.expiry * 1000);
        const expiry: string = expiryDate.toString();
        result.licenseExpiryDate = expiry;
      }
    }
    return result;
  }

  private updateLicenseInfo(): void {
    const activeLicense: License = this.getStoredLicense();
    const previousAppSourceLicense: IAppSourceLicense = this.getPreviousAppSourceLicense();
    const currentAppSourceLicense: IAppSourceLicense = this.getCurrentAppSourceLicense();
    const tenantLicense: ITenantLicense = this.getTenantLicense();

    this.licenseInfo.currentPlan = this.getUserLicensePlan(currentAppSourceLicense);
    this.licenseInfo.storedPlan = this.getUserLicensePlan(previousAppSourceLicense);
    this.licenseInfo.tenantPlan = this.getTenantLicensePlan(tenantLicense);
    if (activeLicense && activeLicense.modelCreationDate) {
      const modelExpiryDate = new Date(activeLicense.modelCreationDate);
      modelExpiryDate.setDate(modelExpiryDate.getDate() + EXPIRY_DAYS);
      this.licenseInfo.modelCreationDate = activeLicense.modelCreationDate.toString();
      this.licenseInfo.modelExpiryDate = modelExpiryDate.toString();
    } else {
      this.licenseInfo.modelCreationDate = 'Empty';
      this.licenseInfo.modelExpiryDate = 'Empty';
    }
    if (activeLicense && activeLicense.offlineLicense) {
      const expiryDate: Date = new Date(activeLicense.offlineLicense.expiry * 1000);
      this.licenseInfo.offlineLicenseExpiryDate = expiryDate.toString();
    } else {
      this.licenseInfo.offlineLicenseExpiryDate = 'Empty';
    }
    this.licenseInfo.isSampleReport = activeLicense && activeLicense.isSampleReport ? true : false;
  }

  private isLicenseChanged(): boolean {
    const currentLicense = this.getStoredLicense();
    if (
      currentLicense &&
      this.previousStoredLicense &&
      currentLicense.appSourceLicense?.plan === this.previousStoredLicense.appSourceLicense?.plan &&
      currentLicense.appSourceLicense?.status ===
      this.previousStoredLicense.appSourceLicense?.status &&
      currentLicense.tenantLicense?.expiry === this.previousStoredLicense.tenantLicense?.expiry &&
      currentLicense.tenantLicense?.subscriptionId ===
      this.previousStoredLicense.tenantLicense?.subscriptionId &&
      currentLicense.offlineLicense?.expiry === this.previousStoredLicense.offlineLicense?.expiry &&
      currentLicense.offlineLicense?.btype === this.previousStoredLicense.offlineLicense?.btype &&
      currentLicense.isSampleReport === this.previousStoredLicense.isSampleReport &&
      this.isViewModeChanged() === false
    ) {
      return false;
    }
    return true;
  }

  private async applyAppSourceLicenseAction(state: LicenseState, onError) {
    switch (state) {
      case LicenseState.Blocked: {
        await notifier
          .showLicenseNotification(LicenseNotificationType.VisualIsBlocked)
          .catch(onError);
        break;
      }
      case LicenseState.Upgrade: {
        await notifier.showLicenseNotification(LicenseNotificationType.General).catch(onError);
        break;
      }
      case LicenseState.DowngradedXViewerWarning: {
        await notifier.showDowngradedXViewerWarning().catch(onError);
        break;
      }
      case LicenseState.DowngradedWarning: {
        await notifier.showDowngradedWarning().catch(onError);
        break;
      }
      case LicenseState.RepetitiveFreeWarning: {
        await notifier.showFreeUpgradeWarning(IAlertSize.large).catch(onError);
        break;
      }
      case LicenseState.ModelExpiryAlert: {
        const modelExpiryDate = this.licenseInfo.modelExpiryDate;
        const expiry = new Date(modelExpiryDate);
        const expiryDate =
          expiry.getDate() +
          ' ' +
          new Date(expiry).toLocaleDateString('en-us', {
            year: 'numeric',
            month: 'short',
          });
        await notifier.showFreeGracePeriodWarning(expiryDate).catch(onError);
        break;
      }
      case LicenseState.ValidWithExpiryAlert: {
        await notifier
          .showFeatureBlockedNotification(
            'Visual license is in grace period, please renew your license to continue using the visual.'
          )
          .catch(onError);
        break;
      }
      case LicenseState.ForceValidWithExpiryAlert: {
        await notifier.clear(true, true).catch(onError);
        await notifier
          .showFeatureBlockedNotification(
            'Visual license is in grace period, please renew your license to continue using the visual.'
          )
          .catch(onError);
        break;
      }
    }
  }

  private async applyOnlineLicenseAction(state: LicenseState, onError) {
    const subscriptionId = this.getTenantLicense()
      ? ' ' + this.getTenantLicense().subscriptionId
      : '';
    const expiry = this.getTenantLicense()
      ? new Date(this.getTenantLicense().expiry * 1000)
      : new Date(Date.now());
    const expiryDate =
      expiry.getDate() +
      ' ' +
      new Date(expiry).toLocaleDateString('en-us', {
        year: 'numeric',
        month: 'short',
      });
    switch (state) {
      case LicenseState.TrialValidWithExpiryAlert: {
        const headerText = 'License warning';
        const bannerMessage = `Your trial is about to expire on <b>(${expiryDate})</b>. Upgrade your subscription to continue using ValQ${subscriptionId}.`;
        const buttonText = 'Upgrade';
        await notifier.showWarning(headerText, bannerMessage, buttonText).catch(onError);
        break;
      }
      case LicenseState.SubscriptionValidWithExpiryAlert: {
        const headerText = 'License warning';
        const bannerMessage = `Your subscription is about to expire on <b>(${expiryDate})</b>. Renew your subscription to continue using ValQ${subscriptionId}.`;
        const buttonText = 'Renew';
        await notifier.showWarning(headerText, bannerMessage, buttonText).catch(onError);
        break;
      }
      case LicenseState.TrialExpiredAlert: {
        const headerText = 'Trial expired';
        const bannerMessage = `Your trial has expired. Upgrade your subscription to continue using ValQ${subscriptionId}.`;
        const buttonText = 'Upgrade';
        await notifier.showBlocker(headerText, bannerMessage, buttonText).catch(onError);
        break;
      }
      case LicenseState.SubscriptionExpiredAlert: {
        const headerText = 'Subscription expired';
        const bannerMessage = `Your subscription has expired. Renew your subscription to continue using ValQ${subscriptionId}.`;
        const buttonText = 'Renew';
        await notifier.showBlocker(headerText, bannerMessage, buttonText).catch(onError);
        break;
      }
      case LicenseState.SubscriptionForReportServerAlert: {
        const headerText = 'Report server license needed';
        const bannerMessage = `A report server license is required to use ValQ on report server${subscriptionId}.`;
        const buttonText = 'Contact Support';
        await notifier.showBlocker(headerText, bannerMessage, buttonText).catch(onError);
        break;
      }
      case LicenseState.SubscriptionForEmbeddedReportAlert: {
        const headerText = 'Embedded report license needed';
        const bannerMessage = `A embedded server license is required to use ValQ on embedded report${subscriptionId}.`;
        const buttonText = 'Contact Support';
        await notifier.showBlocker(headerText, bannerMessage, buttonText).catch(onError);
        break;
      }
      case LicenseState.SubscriptionForPowerBiServiceAlert: {
        const headerText = 'PowerBi service license needed';
        const bannerMessage = `PowerBi service license is required to use ValQ on PowerBi service${subscriptionId}.`;
        const buttonText = 'Contact Support';
        await notifier.showBlocker(headerText, bannerMessage, buttonText).catch(onError);
        break;
      }
      case LicenseState.TenantBlocked: {
        const headerText = 'Subscription needed';
        const bannerMessage = 'A subscription is required to use ValQ on PowerBi service.';
        const buttonText = 'Purchase Subscription';
        await notifier.showBlocker(headerText, bannerMessage, buttonText).catch(onError);
        break;
      }
    }
  }

  private async applyAction(state: LicenseState, onError) {
    logger('license.action.done', 'info')
    // Logger.info('license.action.done');
    switch (state) {
      case LicenseState.Blocked:
      case LicenseState.Upgrade:
      case LicenseState.DowngradedXViewerWarning:
      case LicenseState.DowngradedWarning:
      case LicenseState.RepetitiveFreeWarning:
      case LicenseState.ModelExpiryAlert:
      case LicenseState.ValidWithExpiryAlert:
      case LicenseState.ForceValidWithExpiryAlert: {
        await this.applyAppSourceLicenseAction(state, onError).catch(onError);
        break;
      }
      case LicenseState.TrialValidWithExpiryAlert:
      case LicenseState.SubscriptionValidWithExpiryAlert:
      case LicenseState.TrialExpiredAlert:
      case LicenseState.SubscriptionExpiredAlert:
      case LicenseState.SubscriptionForReportServerAlert:
      case LicenseState.SubscriptionForEmbeddedReportAlert:
      case LicenseState.SubscriptionForPowerBiServiceAlert:
      case LicenseState.TenantBlocked: {
        await this.applyOnlineLicenseAction(state, onError).catch(onError);
        break;
      }
      case LicenseState.Valid:
      default: {
        await notifier.clear(true, true).catch(onError);
        break;
      }
    }
  }

  private getOrderedActionStates(states: LicenseState[]): LicenseState[] {
    if (states.length < 2) {
      return states;
    } else {
      const nonDuplicateStates = states.filter((state, index) => states.indexOf(state) === index);
      if (nonDuplicateStates.length < 2) {
        return nonDuplicateStates;
      } else {
        const highPriorityStates = nonDuplicateStates.filter((state) =>
          highPriorityActionStates.includes(state)
        );
        const lowPriorityStates = nonDuplicateStates.filter(
          (state) => !highPriorityActionStates.includes(state)
        );
        const combinableStates = [...highPriorityStates, ...lowPriorityStates].filter(
          (state) => !nonCombinableActionStates.includes(state)
        );
        return combinableStates;
      }
    }
  }

  public validate(
    viewMode: ViewMode,
    isViewModeChange: boolean,
    visualSettings: any
  ): Promise<void> {
    console.log("🚀 ~ Licensor ~ validate:")
    this.viewMode = viewMode;
    this.isViewModeChange = isViewModeChange;
    this.visualSettings = visualSettings;
    // #NEEDTOCHECK I think we need to add proproperties logic here
    const promiseFunc = async (resolve, reject) => {
      const done = () => {
        this.validatePromise = null;
        resolve();
      };
      const action = async (states: LicenseState[]) => {
        const orderedStates = this.getOrderedActionStates(states);
        this.licenseStates = [...orderedStates];
        this.updateLicenseInfo();
        const isLicenseChanged: boolean = this.isLicenseChanged();
        this.previousStoredLicense = this.getStoredLicense();
        if (isLicenseChanged && this.onLicenseChange) {
          this.onLicenseChange();
        }
        const actionPromise: (state: LicenseState) => Promise<void> = async (
          state: LicenseState
        ) => {
          const isRepetitiveAction: boolean = repetitiveActionStates.includes(state);
          if (isLicenseChanged || isRepetitiveAction) {
            await this.applyAction(state, reject);
          }
        };
        while (orderedStates.length > 0) {
          await actionPromise(orderedStates.shift());
        }
        done();
      };

      if (EnvVariables.isDevEnv) {
        done();
      } else if (EnvVariables.isQAEnv && !EnvVariables.isMockLicense) {
        done();
      } else {
        this.setLicenseManagerApplied(null);
        const selectedLicenseManager = this.licenseManagers.find((licenseManager) =>
          licenseManager.isMatchingLicenseType()
        );
        if (selectedLicenseManager) {
          this.setLicenseManagerApplied(selectedLicenseManager.getName());
          const states: LicenseState[] = <LicenseState[]>(
            await selectedLicenseManager.isValid().catch(reject)
          );
          await selectedLicenseManager.update().catch(reject);
          await action(states);
        } else {
          await action([LicenseState.Blocked]);
        }
      }
    };
    if (!this.validatePromise) {
      this.validatePromise = new Promise<void>(promiseFunc);
    }

    return this.validatePromise;
  }

  public persist(licenseProps: Partial<License>): void {
    let propsChanged: string[] = licenseProps ? Object.keys(licenseProps) : [];
    const licenseStore: any = this.visualSettings.licenseStore;

    // Prepare properties object
    const props = propsChanged.reduce((res: any, prop: string) => {
      let propVal: any = licenseProps[prop];
      if (Object.prototype.hasOwnProperty.call(licenseStore, prop)) {
        if (
          typeof propVal === 'object' &&
          propVal != null &&
          (prop === 'offlineLicense' || prop === 'tenantLicense')
        ) {
          propVal = EncryptUtil.encrypt(JSON.stringify(propVal));
        } else if (typeof propVal === 'object' && propVal instanceof Date) {
          propVal = propVal.toString();
        } else if (typeof propVal === 'object' && propVal != null) {
          propVal = JSON.stringify(propVal);
        } else if (typeof propVal === 'object' && propVal === null) {
          propVal = '';
        }
        if (licenseStore[prop] !== propVal) {
          (res = res || {})[prop] = propVal;
        }
      }
      return res;
    }, null);

    // For removing Model Creation Date overwrite
    const existingCreationDate = this.getStoredModelCreationDate();
    if (!Utils.isEmpty(existingCreationDate) && !Utils.isEmpty(props?.modelCreationDate)) {
      delete props.modelCreationDate;
    }

    // For updating licenseStore with property change
    propsChanged = props ? Object.keys(props) : [];
    propsChanged.forEach((prop) => {
      licenseStore[prop] = props[prop];
    });

    // Actual license data persist into licenseStore of visual host
    this.visualHost.persistProperties({
      merge: [
        {
          objectName: 'licenseStore',
          selector: undefined,
          properties: props,
        },
      ],
    });
  }
}

export default new Licensor();
