import powerbi from 'powerbi-visuals-api';
import LicenseInfoResult = powerbi.extensibility.visual.LicenseInfoResult;
import ServicePlanState = powerbi.ServicePlanState;
import ServicePlan = powerbi.extensibility.visual.ServicePlan;
// import { Logger } from '@lumel/valq-engine/dist/Debug/Logger';
import logger from './logger';

const USE_INBUILD_MOCK = true;

const MOCK_URL = 'https://eo3q2x7o024ul9g.m.pipedream.net?project=valq';

export const MOCK_LICENSE_PLANS = [
  {
    value: 'valq-premium.tier1-premium',
    label: 'ValQ Premium Small(5 to 24 users)',
  },
  {
    value: 'valq-premium.tier2-premium',
    label: 'ValQ Premium Medium(25 to 99 users)',
  },
  {
    value: 'valq-premium.tier3-premium',
    label: 'ValQ Premium Large(100 to 999 users)',
  },
  {
    value: 'valq-premium.premium-xxviewer',
    label: 'ValQ Premium Developer - Unlimited Viewers',
  },
];

export const MOCK_LICENSE: IMockServiceResponse = {
  user1: [
    {
      spIdentifier: 'valq-premium.tier1-premium',
      state: ServicePlanState.Active,
    },
  ],
  user2: [
    {
      spIdentifier: 'valq-premium.tier1-premium',
      state: ServicePlanState.Inactive,
    },
  ],
  user3: [
    {
      spIdentifier: 'valq-premium.tier1-premium',
      state: ServicePlanState.Warning,
    },
  ],
  user4: [
    {
      spIdentifier: 'valq-premium.tier2-premium',
      state: ServicePlanState.Active,
    },
  ],
  user5: [
    {
      spIdentifier: 'valq-premium.tier2-premium',
      state: ServicePlanState.Inactive,
    },
  ],
  user6: [
    {
      spIdentifier: 'valq-premium.tier2-premium',
      state: ServicePlanState.Warning,
    },
  ],
  user7: [
    {
      spIdentifier: 'valq-premium.tier3-premium',
      state: ServicePlanState.Active,
    },
  ],
  user8: [
    {
      spIdentifier: 'valq-premium.tier3-premium',
      state: ServicePlanState.Inactive,
    },
  ],
  user9: [
    {
      spIdentifier: 'valq-premium.tier3-premium',
      state: ServicePlanState.Warning,
    },
  ],
  user10: [
    {
      spIdentifier: 'valq-premium.premium-xxviewer',
      state: ServicePlanState.Active,
    },
  ],
  user11: [
    {
      spIdentifier: 'valq-premium.premium-xxviewer',
      state: ServicePlanState.Inactive,
    },
  ],
  user12: [
    {
      spIdentifier: 'valq-premium.premium-xxviewer',
      state: ServicePlanState.Warning,
    },
  ],
};

const USERS_LIST = [
  {
    label: 'Select license user',
    value: 'none',
  },
  {
    label: 'User 1',
    value: 'user1',
  },
  {
    label: 'User 2',
    value: 'user2',
  },
  {
    label: 'User 3',
    value: 'user3',
  },
  {
    label: 'User 4',
    value: 'user4',
  },
  {
    label: 'User 5',
    value: 'user5',
  },
  {
    label: 'User 6',
    value: 'user6',
  },
  {
    label: 'User 7',
    value: 'user7',
  },
  {
    label: 'User 8',
    value: 'user8',
  },
  {
    label: 'User 9',
    value: 'user9',
  },
  {
    label: 'User 10',
    value: 'user10',
  },
  {
    label: 'User 11',
    value: 'user11',
  },
  {
    label: 'User 12',
    value: 'user12',
  },
];

interface IMockServiceResponse {
  [key: string]: ServicePlan[];
}

class AppSourceLicenseMockup {
  private activeServiceResponse: IMockServiceResponse;

  constructor() {
    this.activeServiceResponse = {};
  }

  private hide(): void {
    const userSelectPopup: HTMLElement | null = document.querySelector('.valq-mockup');
    if (userSelectPopup) {
      userSelectPopup.remove();
    }
  }

  private show(onchange: (value: string, currentDate: Date) => void, onlyDate: boolean): void {
    this.hide();
    const mockPopup: HTMLDivElement = document.createElement('div');
    mockPopup.classList.add(`valq-mockup`);
    mockPopup.style.position = 'absolute';
    mockPopup.style.top = '20px';
    mockPopup.style.left = '20px';
    mockPopup.style.width = '400px';
    mockPopup.style.borderWidth = '1px';
    mockPopup.style.borderColor = 'black';
    mockPopup.style.borderStyle = 'solid';
    mockPopup.style.backgroundColor = 'white';
    mockPopup.style.zIndex = '100000';
    const currentDateControl: HTMLInputElement = document.createElement('input');
    currentDateControl.type = 'text';
    currentDateControl.style.padding = '20px';
    currentDateControl.style.width = '50%';
    if (onlyDate) {
      currentDateControl.style.width = '100%';
      mockPopup.style.width = '200px';
    }
    currentDateControl.style.cursor = 'pointer';
    currentDateControl.placeholder = 'Open this visual on date...';
    currentDateControl.addEventListener('focus', () => {
      currentDateControl.type = 'date';
    });
    currentDateControl.addEventListener('blur', () => {
      if (!currentDateControl.disabled) {
        currentDateControl.type = 'text';
      }
    });
    currentDateControl.addEventListener('change', () => {
      currentDateControl.disabled = true;
      userSelectControl.disabled = false;
      if (onlyDate) {
        const currentDate = new Date(currentDateControl.value);
        onchange && onchange(null, currentDate);
        this.hide();
      }
    });
    mockPopup.appendChild(currentDateControl);
    const userSelectControl: HTMLSelectElement = document.createElement('select');
    userSelectControl.style.padding = '20px';
    userSelectControl.style.width = '50%';
    userSelectControl.style.cursor = 'pointer';
    userSelectControl.disabled = true;
    USERS_LIST.forEach((user) => {
      const option: HTMLOptionElement = document.createElement('option');
      option.value = user.value;
      option.innerText = user.label;
      userSelectControl.appendChild(option);
    });
    userSelectControl.addEventListener('change', () => {
      const selectedUser = userSelectControl.value;
      const currentDate = new Date(currentDateControl.value);
      onchange && onchange(selectedUser, currentDate);
      this.hide();
    });
    if (!onlyDate) {
      mockPopup.appendChild(userSelectControl);
    }
    document.body.appendChild(mockPopup);
  }

  public apply(
    onlyDate: boolean
  ): Promise<{ licenseInfoResult: LicenseInfoResult; currentDate: Date }> {
    const promiseFunc = async (resolve) => {
      const show = () => {
        this.show((selectedUser: string, currentDate: Date) => {
          logger('Mock License Configured:', 'info');
          // Logger.info('Mock License Configured:');

          logger(`${this.activeServiceResponse}`, 'info');
          // Logger.info(this.activeServiceResponse);

          const selectedUserPlans = this.activeServiceResponse[selectedUser];
          logger('Mock License Plans Selected:', 'info');
          // Logger.info('Mock License Plans Selected:');
          logger(`${selectedUserPlans}`, 'info');
          // Logger.info(selectedUserPlans);
          resolve({
            licenseInfoResult: {
              plans: selectedUserPlans || [],
              isLicenseUnsupportedEnv: false,
              isLicenseInfoAvailable: true,
            },
            currentDate,
          });
        }, onlyDate);
      };
      const onError = () => {
        this.activeServiceResponse = MOCK_LICENSE;
        show();
      };
      if (USE_INBUILD_MOCK) {
        this.activeServiceResponse = MOCK_LICENSE;
        show();
      } else {
        const res: Response = <Response>await fetch(MOCK_URL, { method: 'GET' }).catch(onError);
        const resJson = await res.json().catch(onError);
        this.activeServiceResponse = resJson;
        show();
      }
    };

    return new Promise(promiseFunc);
  }
}

export default new AppSourceLicenseMockup();
