export const EXPIRY_DAYS: number = 30;

export const EXPIRY_ALERT_DAYS: number = 4;

export type BuildType = 'appsource' | 'private';

export type BuildEnvironment = 'prod' | 'qa' | 'dev';

export type PlanName =
  | 'PREMIUM_SMALL'
  | 'PREMIUM_MEDIUM'
  | 'PREMIUM_LARGE'
  | 'PREMIUM_UNLIMITED_SERVICE_VIEWER'
  | 'FREE';

interface IBuildTypes {
  [key: string]: BuildType;
}

interface IBuildEnvironments {
  [key: string]: BuildEnvironment;
}

interface IPlanNames {
  [key: string]: PlanName;
}

export const BUILD_TYPES: IBuildTypes = {
  APPSOURCE: 'appsource',
  PRIVATE: 'private',
};

export const BUILD_ENVIRONMENT: IBuildEnvironments = {
  QA: 'qa',
  DEV: 'dev',
  PROD: 'prod',
};

export enum LICENSE_ENV {
  REPORT_SERVER = 1,
  EMBEDDED = 2,
  POWERBI_SERVICE = 3,
}

export interface IPlanConfig {
  regex: RegExp;
  buildType: BuildType;
  unlimitedViewerEnvs?: LICENSE_ENV[];
  plan: string;
  priority: number;
}

export const PLAN_NAMES: IPlanNames = {
  FREE_PLAN: 'FREE',
  PREMIUM_SMALL: 'PREMIUM_SMALL',
  PREMIUM_MEDIUM: 'PREMIUM_MEDIUM',
  PREMIUM_LARGE: 'PREMIUM_LARGE',
  PREMIUM_UNLIMITED_SERVICE_VIEWER: 'PREMIUM_UNLIMITED_SERVICE_VIEWER',
};

export const PLAN_CONFIG_LIST: IPlanConfig[] = [
  {
    regex: /.*tier[1]-premium$/,
    buildType: BUILD_TYPES.PREMIUM,
    plan: PLAN_NAMES.PREMIUM_SMALL,
    priority: 1,
  },
  {
    regex: /.*tier[2]-premium$/,
    buildType: BUILD_TYPES.PREMIUM,
    plan: PLAN_NAMES.PREMIUM_MEDIUM,
    priority: 1,
  },
  {
    regex: /.*tier[3-9]-premium$/,
    buildType: BUILD_TYPES.PREMIUM,
    plan: PLAN_NAMES.PREMIUM_LARGE,
    priority: 1,
  },
  {
    regex: /.*premium-xxviewer$/,
    buildType: BUILD_TYPES.PREMIUM,
    unlimitedViewerEnvs: [
      LICENSE_ENV.REPORT_SERVER,
      LICENSE_ENV.EMBEDDED,
      LICENSE_ENV.POWERBI_SERVICE,
    ],
    plan: PLAN_NAMES.PREMIUM_UNLIMITED_SERVICE_VIEWER,
    priority: 4,
  },
];
