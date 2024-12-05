import { saferHTML } from './saferHtml';
import { Utils } from '../Utils';

const freePopupId = 'valq-free-plan-popup';
const infoPopupId = `valq-license-info`;

export enum IAlertPosition {
  top = 1,
  bottom = 2,
}

export enum IAlertSize {
  small = 1,
  large = 2,
}

export interface ILicensePopUpProps {
  id: string;
  headerMessage: string;
  position: IAlertPosition;
  descriptionText?: string;
  buttonText?: string;
  size?: IAlertSize;
  isCloseable?: boolean;
  learnMoreUrl?: string;
  upgradeCallback?: (buttonText: string) => void;
  onClose?: () => void;
}

export class Alert {
  public static isVisible = (id: string = null): boolean => {
    const selector = id
      ? `.${freePopupId}#${id},.${infoPopupId}#${id}`
      : `.${freePopupId},.${infoPopupId}`;
    const popUp: HTMLElement = document.querySelector(selector);
    if (popUp) {
      return true;
    }
    return false;
  };

  public static removeFreePlanPopUp = () => {
    const planPopUp: HTMLElement = document.querySelector(`.${freePopupId}`);
    if (planPopUp) {
      planPopUp.remove();
    }
  };

  public static renderFreePlanPopUp = (props: ILicensePopUpProps) => {
    Alert.removeFreePlanPopUp();
    const {
      id = null,
      headerMessage,
      position,
      descriptionText = 'You need a license to use this visual',
      buttonText = 'Purchase License',
      size = 'large',
      isCloseable = false,
      learnMoreUrl = null,
      upgradeCallback = null,
      onClose = null,
    } = props;
    const headerText = headerMessage;
    const planPopUp = document.createElement('div');
    planPopUp.classList.add(freePopupId);
    planPopUp.classList.add(position === IAlertPosition.top ? 'top' : 'bottom');
    planPopUp.classList.add(size === IAlertSize.large ? 'large' : 'small');
    planPopUp.id = id ? id : freePopupId;
    const logoDiv = document.createElement('div');
    logoDiv.classList.add('logo-div');
    const valqLogo = document.createElement('div');
    valqLogo.classList.add('application-logo');
    logoDiv.appendChild(valqLogo);
    planPopUp.appendChild(logoDiv);
    const header = document.createElement('div');
    header.classList.add('free-plan-header');
    saferHTML(header, headerText);
    const description = document.createElement('div');
    description.classList.add('free-plan-description');
    saferHTML(description, descriptionText);
    planPopUp.appendChild(header);
    planPopUp.appendChild(description);
    if (upgradeCallback) {
      const upgradeButton = document.createElement('div');
      upgradeButton.classList.add('free-plan-upgrade-btn');
      upgradeButton.addEventListener('click', () => {
        upgradeCallback && upgradeCallback(buttonText);
      });
      saferHTML(upgradeButton, buttonText);
      planPopUp.appendChild(upgradeButton);
    }
    if (learnMoreUrl) {
      const helpSection = document.createElement('div');
      helpSection.classList.add('help-container');
      const learnMore = document.createElement('span');
      learnMore.appendChild(document.createTextNode('Learn More >'));
      learnMore.title = 'Click to learn more';
      learnMore.addEventListener('click', () =>
        (<any>window).visualHost?.launchUrl?.(learnMoreUrl)
      );
      helpSection.appendChild(learnMore);
      planPopUp.appendChild(helpSection);
    }
    if (isCloseable) {
      const licenseInfoClose = document.createElement('div');
      licenseInfoClose.className = 'valq-popup-close ms-Icon ms-Icon--ChromeClose';
      planPopUp.appendChild(licenseInfoClose);
      licenseInfoClose.addEventListener('click', () => {
        Alert.removeFreePlanPopUp();
        onClose && onClose();
      });
    }
    document.body.appendChild(planPopUp);
  };

  public static removeLicenseInfo = () => {
    let infoDiv: HTMLElement = document.querySelector(`.${infoPopupId}`);

    if (infoDiv) {
      const overlayclass = infoDiv.dataset.overlayclass;
      if (overlayclass) {
        infoDiv = document.querySelector(`.${overlayclass}`);
      }
      infoDiv.parentNode.removeChild(infoDiv);
    }
  };

  public static renderLicenseInfo = (props: ILicensePopUpProps) => {
    Alert.removeLicenseInfo();
    const {
      id = null,
      position,
      size = 'large',
      headerMessage,
      descriptionText = 'You need a license to use this visual',
      buttonText = 'Purchase License',
      isCloseable = true,
      upgradeCallback = null,
      onClose = null,
    } = props;
    const infoDiv = document.createElement('div');
    infoDiv.classList.add(infoPopupId);
    infoDiv.classList.add(position === IAlertPosition.top ? 'top' : 'bottom');
    infoDiv.classList.add(size === IAlertSize.large ? 'large' : 'small');

    infoDiv.id = id ? id : infoPopupId;
    const planText = headerMessage.charAt(0).toUpperCase() + headerMessage.slice(1);

    const licenseInfoContainer = document.createElement('div');
    licenseInfoContainer.className = 'valq-license-info-container';

    const licenseInfoHeader = document.createElement('div');
    licenseInfoHeader.className = 'valq-license-info-header';

    const licenseInfoLock = document.createElement('div');
    licenseInfoLock.className = 'valq-license-info-lock';

    const licenseInfoHeaderText = document.createElement('div');
    licenseInfoHeaderText.className = 'valq-license-info-header-text';

    const planStrongText = document.createElement('strong');
    saferHTML(planStrongText, planText);

    const licenseInfoMessage = document.createElement('div');
    licenseInfoMessage.className = 'valq-license-info-message';
    saferHTML(licenseInfoMessage, descriptionText);

    const lockImg = document.createElement('img');
    lockImg.src =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAABmJLR0QA/wD/AP+gvaeTAAAAz0lEQVRIie2UMQ7CMAxFn1jo0N4A7tPShYtAOWZhKuwsyQ2AHYY6UoYkDQkSReJLf0ns/53YMswABdABR+Ah7IE9sMwVXwMX4OnhAKxSxQtL/Ay0QClsrbuBxJccLPHScV8BV4nZpRicJLkNxGwlpk8xuEuyq3qDSmJuKQamkVlxC8dZDWiHgI8GSnInoSJEfVQxBrFfE5Xn+qKPYlYGG8bma6DJMfX1QBNu5nd64ILvBQ1j5b55j56+/5hOGpg99O6asHODqEnbR9HL7rfwAkgzcXb6Jg1XAAAAAElFTkSuQmCC';
    lockImg.setAttribute('height', '15');
    lockImg.setAttribute('width', '15');
    licenseInfoLock.appendChild(lockImg);
    licenseInfoHeader.appendChild(licenseInfoLock);
    licenseInfoHeaderText.appendChild(planStrongText);
    licenseInfoHeader.appendChild(licenseInfoHeaderText);
    if (isCloseable) {
      const licenseInfoClose = document.createElement('div');
      licenseInfoClose.className = 'valq-popup-close ms-Icon ms-Icon--ChromeClose';
      licenseInfoHeader.appendChild(licenseInfoClose);
      licenseInfoClose.addEventListener('click', () => {
        Alert.removeLicenseInfo();
        onClose && onClose();
      });
    } else {
      const delayedCall = Utils.debounce(Alert.removeLicenseInfo, 10000);
      delayedCall();
    }

    licenseInfoContainer.appendChild(licenseInfoHeader);
    licenseInfoContainer.appendChild(licenseInfoMessage);

    if (upgradeCallback) {
      const licenseInfoUpgrade = document.createElement('div');
      licenseInfoUpgrade.className = 'valq-license-info-button valq-license-info-upgrade';
      const upgradeSpan = document.createElement('span');
      upgradeSpan.appendChild(document.createTextNode(buttonText));
      licenseInfoUpgrade.appendChild(upgradeSpan);
      licenseInfoUpgrade.addEventListener(
        'click',
        () => upgradeCallback && upgradeCallback(buttonText)
      );
      licenseInfoContainer.appendChild(licenseInfoUpgrade);
    }

    infoDiv.appendChild(licenseInfoContainer);
    (document.getElementById('sandbox-host') || document.body).appendChild(infoDiv);
  };
}
