import { debounce } from 'lodash';

export class Utils {
  public static isEmpty = (value: any): boolean => {
    return ['', null, undefined].includes(value);
  };

  public static debounce = debounce;
}
