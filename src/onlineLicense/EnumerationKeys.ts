import powerbi from 'powerbi-visuals-api';
import ServicePlanState = powerbi.ServicePlanState;
import CustomVisualHostEnv = powerbi.common.CustomVisualHostEnv;
import { LicenseState } from './Licensor';
import { LICENSE_ENV } from './Constants';

export class EnumerationKeys {
  public static getLicenseStateKey(keyFor: LicenseState): string {
    switch (keyFor) {
      case LicenseState.Blocked:
        return 'Blocked';
      case LicenseState.DowngradedWarning:
        return 'DowngradedWarning';
      case LicenseState.DowngradedXViewerWarning:
        return 'DowngradedXViewerWarning';
      case LicenseState.ModelExpiryAlert:
        return 'ModelExpiryAlert';
      case LicenseState.RepetitiveFreeWarning:
        return 'RepetitiveFreeWarning';
      case LicenseState.Upgrade:
        return 'Upgrade';
      case LicenseState.Valid:
        return 'Valid';
      case LicenseState.ValidWithExpiryAlert:
        return 'ValidWithExpiryAlert';
      case LicenseState.ForceValidWithExpiryAlert:
        return 'ForceValidWithExpiryAlert';
      case LicenseState.TrialValidWithExpiryAlert:
        return 'TrialValidWithExpiryAlert';
      case LicenseState.SubscriptionValidWithExpiryAlert:
        return 'SubscriptionValidWithExpiryAlert';
      case LicenseState.TrialExpiredAlert:
        return 'TrialExpiredAlert';
      case LicenseState.SubscriptionExpiredAlert:
        return 'SubscriptionExpiredAlert';
      case LicenseState.SubscriptionForReportServerAlert:
        return 'SubscriptionForReportServerAlert';
      case LicenseState.SubscriptionForEmbeddedReportAlert:
        return 'SubscriptionForEmbeddedReportAlert';
      case LicenseState.SubscriptionForPowerBiServiceAlert:
        return 'SubscriptionForPowerBiServiceAlert';
      case LicenseState.TenantBlocked:
        return 'TenantBlocked';
      default:
        throw new Error('license.state.not.exist');
    }
  }

  public static getServicePlanStateKey(keyFor: ServicePlanState): string {
    switch (keyFor) {
      case ServicePlanState.Active:
        return 'Active';
      case ServicePlanState.Inactive:
        return 'Inactive';
      case ServicePlanState.Suspended:
        return 'Suspended';
      case ServicePlanState.Unknown:
        return 'Unknown';
      case ServicePlanState.Warning:
        return 'Warning';
      default:
        throw new Error('license.service.plan.state.not.exist');
    }
  }

  public static getCustomVisualHostEnvKey(keyFor: CustomVisualHostEnv): string {
    switch (keyFor) {
      case CustomVisualHostEnv.Desktop:
        return 'Desktop';
      case CustomVisualHostEnv.Embed:
        return 'Embed';
      case CustomVisualHostEnv.ExportReportHost:
        return 'ExportReportHost';
      case CustomVisualHostEnv.Mobile:
        return 'Mobile';
      case CustomVisualHostEnv.PublishToWeb:
        return 'PublishToWeb';
      case CustomVisualHostEnv.ReportServer:
        return 'ReportServer';
      case CustomVisualHostEnv.Web:
        return 'Web';
      default:
        throw new Error('license.custom.visual.host.env.not.exist');
    }
  }

  public static getLicenseEnvKey(keyFor: LICENSE_ENV): string {
    switch (keyFor) {
      case LICENSE_ENV.EMBEDDED:
        return 'EMBEDDED';
      case LICENSE_ENV.POWERBI_SERVICE:
        return 'POWERBI_SERVICE';
      case LICENSE_ENV.REPORT_SERVER:
        return 'REPORT_SERVER';
      default:
        throw new Error('license.environment.key.not.exist');
    }
  }
}
