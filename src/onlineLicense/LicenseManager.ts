import { Licensor, LicenseState } from './Licensor';

export default abstract class LicenseManager {
  private licensor: Licensor;

  public init(licensor: Licensor) {
    this.licensor = licensor;
  }

  public getLicensor(): Licensor {
    return this.licensor;
  }

  public abstract isMatchingLicenseType(): boolean;
  public abstract isValid(): Promise<LicenseState[]>;
  public abstract update(): Promise<void>;
  public abstract getName(): string;
}
