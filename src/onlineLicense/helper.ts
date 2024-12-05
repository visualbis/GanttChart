export interface IUserLicensePlan {
    name: string;
    state: string;
    unlimitedViewerEnvs?: string[];
    buildType?: string;
    priority?: string;
}
export interface ITenantLicensePlan {
    id: string;
    subscriptionId: string;
    licenseExpiryDate: string;
}
export interface ILicenseInfo {
    plans: IUserLicensePlan[];
    currentPlan: IUserLicensePlan;
    storedPlan: IUserLicensePlan;
    tenantPlan: ITenantLicensePlan;
    modelCreationDate: string;
    modelExpiryDate: string;
    offlineLicenseExpiryDate: string;
    isFreeLicensePlan: boolean;
    isSampleReport: boolean;
}

export interface IBuildInfo {
    buildType: string;
    buildEnvironment: string;
    buildDate: string;
    version: string;
}

export const LICENSE_DEFAULT = {
    plans: [],
    currentPlan: null,
    storedPlan: null,
    tenantPlan: null,
    modelCreationDate: "",
    modelExpiryDate: "",
    offlineLicenseExpiryDate: "",
    isFreeLicensePlan: false,
    isSampleReport: false
};