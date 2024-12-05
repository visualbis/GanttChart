import powerbi from 'powerbi-visuals-api';
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import LicenseNotificationType = powerbi.LicenseNotificationType;
import { EnvVariables } from './EnvVariables';
import { Alert, IAlertPosition, IAlertSize } from './Alert';
import { Utils } from '../Utils';
import Config from '../Config';

interface IDisplayStatus {
  isIconDisplayed: boolean;
  isBlockerDisplayed: boolean;
  isEnvironmentBlockerDisplayed: boolean;
  isFeatureBlockedDisplayed: boolean;
}

class Notifier {
  private static instance;
  private ready: Promise<void>;
  private readyResolve: (...args) => void;
  private visualHost: IVisualHost;
  private displayStatus: IDisplayStatus;

  constructor() {
    if (Notifier.instance) {
      return Notifier.instance;
    }
    Notifier.instance = this;
    this.ready = null;
    this.readyResolve = null;
    this.setReady = this.setReady.bind(this);
  }

  private setDelay(delay: number): void {
    this.ready = new Promise((resolve) => {
      const markReady = () => {
        this.ready = null;
        this.readyResolve = null;
        resolve();
      };
      const delayedCall = Utils.debounce(markReady, delay);
      delayedCall();
    });
  }

  private setUnready(): void {
    this.ready = new Promise((resolve) => {
      this.readyResolve = resolve;
    });
  }

  private setReady(): void {
    if (this.ready !== null && this.readyResolve !== null) {
      this.readyResolve();
    }
    this.ready = null;
    this.readyResolve = null;
  }

  private onReady(): Promise<void> {
    if (this.ready === null) {
      return Promise.resolve();
    } else {
      return this.ready;
    }
  }

  public showDowngradedXViewerWarning(): Promise<boolean> {
    const promiseFunc = async (resolve, reject) => {
      const id = 'downgraded_XViewer_warning';
      if (!Alert.isVisible(id)) {
        await this.clear(false).catch(reject);
        Alert.renderLicenseInfo({
          id,
          headerMessage: 'Warning',
          descriptionText:
            'Changes made without correct license will stop the visual access for the report users. Please contact the licensed user to update or save again to fix this.',
          position: IAlertPosition.bottom,
          isCloseable: true,
          size: IAlertSize.small,
          onClose: this.setReady,
        });
        this.setUnready();
        resolve(true);
      } else {
        resolve(true);
      }
    };

    return new Promise(promiseFunc);
  }

  public showDowngradedWarning(): Promise<boolean> {
    const promiseFunc = async (resolve, reject) => {
      const id = 'downgraded_warning';
      if (!Alert.isVisible(id)) {
        await this.clear(false).catch(reject);
        Alert.renderLicenseInfo({
          id,
          headerMessage: 'Warning',
          descriptionText:
            'This visual is created using higher plan, saving this visual will overwrite it with your current plan.',
          position: IAlertPosition.bottom,
          isCloseable: true,
          size: IAlertSize.small,
          onClose: this.setReady,
        });
        this.setUnready();
        resolve(true);
      } else {
        resolve(true);
      }
    };

    return new Promise(promiseFunc);
  }

  public showFreeUpgradeWarning(size: IAlertSize): Promise<boolean> {
    const promiseFunc = async (resolve, reject) => {
      const id = 'free_upgrade_warning';
      if (!Alert.isVisible(id)) {
        await this.clear(false).catch(reject);
        Alert.renderFreePlanPopUp({
          id,
          headerMessage: 'Upgrade to paid version',
          descriptionText: `You are currently using free version of visual.`,
          position: IAlertPosition.bottom,
          isCloseable: true,
          size: size,
          buttonText: 'Start Trial',
          upgradeCallback: () => {
            this.visualHost.launchUrl(Config.PRODUCT_PRICING_URL);
          },
          onClose: this.setReady,
        });
        this.setUnready();
        resolve(true);
      } else {
        resolve(true);
      }
    };

    return new Promise(promiseFunc);
  }

  public showFreeGracePeriodWarning(expiry: string): Promise<boolean> {
    const promiseFunc = async (resolve, reject) => {
      const id = 'free_grace_period_warning';
      if (!Alert.isVisible(id)) {
        await this.clear(false).catch(reject);
        Alert.renderLicenseInfo({
          id,
          headerMessage: 'Warning',
          descriptionText: `This active model is in grace period will expire on (${expiry}), please renew your license to continue using this model.`,
          position: IAlertPosition.bottom,
          isCloseable: true,
          size: IAlertSize.small,
          buttonText: 'Start Trial',
          upgradeCallback: () => {
            this.visualHost.launchUrl(Config.PRODUCT_PRICING_URL);
          },
          onClose: this.setReady,
        });
        this.setUnready();
        resolve(true);
      } else {
        resolve(true);
      }
    };

    return new Promise(promiseFunc);
  }

  public showVisualBlocker(): Promise<boolean> {
    const promiseFunc = async (resolve, reject) => {
      const id = 'license_required';
      if (!Alert.isVisible(id)) {
        await this.clear(false).catch(reject);
        Alert.renderFreePlanPopUp({
          id,
          headerMessage: 'Visual license required',
          descriptionText: `You need license to use this visual. Please contact your administrator to get a license.`,
          position: IAlertPosition.bottom,
          size: IAlertSize.large,
          buttonText: 'Start Trial',
          upgradeCallback: () => {
            this.visualHost.launchUrl(Config.PRODUCT_PRICING_URL);
          },
        });
        this.setDelay(10000);
        resolve(true);
      } else {
        resolve(true);
      }
    };

    return new Promise(promiseFunc);
  }

  public showWarning(header: string, message: string, button: string): Promise<boolean> {
    const promiseFunc = async (resolve, reject) => {
      const id = 'general_warning';
      if (!Alert.isVisible(id)) {
        await this.clear(false).catch(reject);
        Alert.renderLicenseInfo({
          id,
          headerMessage: header,
          descriptionText: message,
          position: IAlertPosition.bottom,
          isCloseable: true,
          size: IAlertSize.small,
          buttonText: button,
          upgradeCallback: () => {
            this.visualHost.launchUrl(Config.PRODUCT_PRICING_URL);
          },
          onClose: this.setReady,
        });
        this.setUnready();
        resolve(true);
      } else {
        resolve(true);
      }
    };

    return new Promise(promiseFunc);
  }

  public showBlocker(header: string, message: string, button: string): Promise<boolean> {
    const promiseFunc = async (resolve, reject) => {
      const id = 'general_blocker';
      if (!Alert.isVisible(id)) {
        await this.clear(false).catch(reject);
        Alert.renderFreePlanPopUp({
          id,
          headerMessage: header,
          descriptionText: message,
          position: IAlertPosition.bottom,
          size: IAlertSize.large,
          buttonText: button,
          upgradeCallback: () => {
            this.visualHost.launchUrl(Config.PRODUCT_PRICING_URL);
          },
        });
        this.setDelay(10000);
        resolve(true);
      } else {
        resolve(true);
      }
    };

    return new Promise(promiseFunc);
  }

  public showAutoHideMessage(message: string): Promise<boolean> {
    const promiseFunc = async (resolve, reject) => {
      const id = 'feature_blocked';
      if (!Alert.isVisible(id)) {
        await this.clear(false).catch(reject);
        Alert.renderLicenseInfo({
          id,
          headerMessage: 'Visual license required',
          descriptionText: message,
          position: IAlertPosition.bottom,
          isCloseable: false,
        });
        this.setDelay(10000);
        resolve(true);
      } else {
        resolve(true);
      }
    };

    return new Promise(promiseFunc);
  }

  public showLicenseNotification(type: LicenseNotificationType): Promise<boolean> {
    const promiseFunc = async (resolve, reject) => {
      const showCustomeNotification = async () => {
        if (type === LicenseNotificationType.VisualIsBlocked) {
          const status: boolean = <boolean>await this.showVisualBlocker().catch(reject);
          resolve(status);
        } else {
          const status: boolean = <boolean>(
            await this.showFreeUpgradeWarning(IAlertSize.small).catch(reject)
          );
          resolve(status);
        }
      };

      if (EnvVariables.isReportServer || EnvVariables.isEmbeddedReport) {
        showCustomeNotification();
        return;
      }

      // To Render Inbuild Notifier
      await this.clear(true).catch(reject);
      const state = await this.visualHost.licenseManager.notifyLicenseRequired(type).catch(reject);
      if (state) {
        this.updateDisplayStatus(type, this.displayStatus.isFeatureBlockedDisplayed);
        this.setDelay(1000);
        resolve(true);
      } else {
        const message = `Upgrade to paid version, you are currently using free version of visual.`;
        const status: boolean = await this.showFeatureBlockedNotification(message).catch(reject);
        resolve(status);
      }
    };

    return new Promise(promiseFunc);
  }

  // This function will be used in the case of feature level licensing
  public showFeatureBlockedNotification(tooltip: string): Promise<boolean> {
    const promiseFunc = async (resolve, reject) => {
      if (EnvVariables.isReportServer || EnvVariables.isEmbeddedReport) {
        const status: boolean = <boolean>await this.showAutoHideMessage(tooltip).catch(reject);
        resolve(status);
        return;
      }

      // To Render Inbuild Notifier
      await this.clear(true).catch(reject);
      const state = await this.visualHost.licenseManager
        .notifyFeatureBlocked(tooltip)
        .catch(reject);
      if (state) {
        this.updateDisplayStatus(undefined, true);
        this.setDelay(1000);
        resolve(true);
      } else {
        const status: boolean = <boolean>await this.showAutoHideMessage(tooltip).catch(reject);
        resolve(status);
      }
    };

    return new Promise(promiseFunc);
  }

  public clear(clearNotification: boolean, force: boolean = false): Promise<boolean> {
    const promiseFunc = async (resolve, reject) => {
      if (force === true) {
        this.setReady();
      }
      await this.onReady().catch(reject);
      Alert.removeFreePlanPopUp();
      Alert.removeLicenseInfo();
      if (clearNotification === true || this.isBlockerVisible()) {
        const status = await this.visualHost.licenseManager
          .clearLicenseNotification()
          .catch(reject);
        if (status) {
          this.updateDisplayStatus(undefined, false);
          resolve(true);
        } else {
          resolve(false);
        }
      } else {
        resolve(false);
      }
    };

    return new Promise(promiseFunc);
  }

  public updateDisplayStatus(
    notification: LicenseNotificationType | undefined,
    isFeatureBlocked: boolean
  ): void {
    this.displayStatus = {
      isIconDisplayed: notification === LicenseNotificationType.General,
      isBlockerDisplayed: notification === LicenseNotificationType.VisualIsBlocked,
      isEnvironmentBlockerDisplayed: notification === LicenseNotificationType.UnsupportedEnv,
      isFeatureBlockedDisplayed:
        isFeatureBlocked &&
        !(
          notification === LicenseNotificationType.UnsupportedEnv ||
          notification === LicenseNotificationType.VisualIsBlocked
        ),
    };
  }

  public isVisible(): boolean {
    return (
      Alert.isVisible() === true ||
      (this.displayStatus !== null &&
        typeof this.displayStatus !== 'undefined' &&
        (this.displayStatus.isIconDisplayed === true ||
          this.displayStatus.isBlockerDisplayed === true ||
          this.displayStatus.isFeatureBlockedDisplayed === true ||
          this.displayStatus.isEnvironmentBlockerDisplayed === true))
    );
  }

  public isBlockerVisible(): boolean {
    return (
      this.displayStatus !== null &&
      typeof this.displayStatus !== 'undefined' &&
      this.displayStatus.isBlockerDisplayed === true
    );
  }

  public init(visualHost: IVisualHost): void {
    this.visualHost = visualHost;
  }
}

export default new Notifier();
