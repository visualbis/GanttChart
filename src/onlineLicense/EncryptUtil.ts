import atob from 'atob';
import nacl from 'tweetnacl';
import { Buffer } from 'buffer';
import { decompressFromUint8Array, compressToUint8Array } from 'lz-string';
import Config from '../Config';
// import { Logger } from '@lumel/valq-engine/dist/Debug/Logger';
import logger from './logger';

export default class EncryptUtil {
  private static convertToUint8Array = (s: string): Uint8Array => {
    return new Uint8Array(
      atob(s)
        .split('')
        .map((c) => {
          return c.charCodeAt(0);
        })
    );
  };

  public static decrypt = (content: string): string => {
    const { PUBLIC_KEY } = process.env;
    const publicKey = EncryptUtil.convertToUint8Array(PUBLIC_KEY ?? Config.PUBLIC_KEY);
    const contentCode = EncryptUtil.convertToUint8Array(content);
    const decompressContent = decompressFromUint8Array(nacl.sign.open(contentCode, publicKey));
    return decompressContent || '';
  };

  public static encrypt = (content: string): string => {
    const { SECRET_KEY } = process.env
    const compressedCode = compressToUint8Array(content);
    const secretKey = EncryptUtil.convertToUint8Array(SECRET_KEY ?? Config.SECRET_KEY);
    const signedCode = nacl.sign(compressedCode, secretKey);
    const base64Str = Buffer.from(signedCode).toString('base64');
    return base64Str;
  };

  public static parse = (key): any => {
    try {
      return JSON.parse(EncryptUtil.decrypt(key));
    } catch (e) {
      logger(e, 'info')
    }
    return null;
  };
}
