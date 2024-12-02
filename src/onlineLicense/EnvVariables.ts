import { default as powerbi } from 'powerbi-visuals-api';
import { LICENSE_ENV, BUILD_ENVIRONMENT } from './Constants';
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import CustomVisualHostEnv = powerbi.common.CustomVisualHostEnv;
import Config from '../Config';
let VERSION: string;
let BUILD_DATE: string;

const EnvVariables = {
    isPBIDesktop: false,
    isReportServer: false,
    isEmbeddedReport: false,
    isPowerBIService: true,
    isExportHost: false,
    locale: 'en-US',
    isDevEnv: Config.BUILD_ENVIRONMENT === BUILD_ENVIRONMENT.DEV,
    isProdEnv: Config.BUILD_ENVIRONMENT === BUILD_ENVIRONMENT.PROD,
    isQAEnv: Config.BUILD_ENVIRONMENT === BUILD_ENVIRONMENT.QA,
    isMockLicense: false,
    isOnlineTrialLicense: false,
    licenseEnv: LICENSE_ENV.POWERBI_SERVICE,
    VERSION: Config.BUILD_ENVIRONMENT === BUILD_ENVIRONMENT.DEV ? VERSION : Config.VERSION,
    BUILD_DATE: Config.BUILD_ENVIRONMENT === BUILD_ENVIRONMENT.DEV ? BUILD_DATE : Config.BUILD_DATE,
};

// @ifdef isMockLicense
EnvVariables.isMockLicense = true;
// @endif

// @ifdef isOnlineTrialLicense
EnvVariables.isOnlineTrialLicense = true;
// @endif

// Development Mode environment modify
console.log("🚀 ~ EnvVariables.isDevEnv:", EnvVariables.isDevEnv)
if (EnvVariables.isDevEnv) {
    EnvVariables.isMockLicense = false;
    EnvVariables.isOnlineTrialLicense = false;
}

const updateEnvVariables = (host: IVisualHost) => {
    EnvVariables.isPBIDesktop = host.hostEnv === CustomVisualHostEnv.Desktop;
    EnvVariables.isReportServer = host.hostEnv === CustomVisualHostEnv.ReportServer;
    EnvVariables.isExportHost = host.hostEnv === CustomVisualHostEnv.ExportReportHost;
    EnvVariables.isEmbeddedReport =
        host.hostEnv === CustomVisualHostEnv.Embed || host.hostEnv === CustomVisualHostEnv.PublishToWeb;
    EnvVariables.locale = host.locale;
    EnvVariables.isPowerBIService =
        !EnvVariables.isPBIDesktop && !EnvVariables.isReportServer && !EnvVariables.isEmbeddedReport;
    EnvVariables.licenseEnv =
        EnvVariables.isPBIDesktop || EnvVariables.isExportHost
            ? null
            : EnvVariables.isEmbeddedReport
                ? LICENSE_ENV.EMBEDDED
                : EnvVariables.isReportServer
                    ? LICENSE_ENV.REPORT_SERVER
                    : LICENSE_ENV.POWERBI_SERVICE;
};

export { EnvVariables, updateEnvVariables };
