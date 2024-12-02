/* eslint-disable powerbi-visuals/non-literal-fs-path -- This file is for translation map file build purpose only */
import atob from 'atob';
import lz from 'lz-string';
import nacl from 'tweetnacl';
import naclutil from 'tweetnacl-util';
import path from 'path';
import fs from 'fs-extra';
import { Utils } from './Utils.mjs';

class LicenseGen {
    init = (environmentConfig) => {
        this.currentConfig = null;
        return new Promise((resolve, reject) => {
            const configPath = path.join(process.cwd(), 'src', 'Config.ts');
            if (fs.existsSync(configPath)) {
                const configJsPath = `${configPath}.mjs`;
                fs.copyFileSync(configPath, configJsPath);
                const configJsPathURL = Utils.getURL(configJsPath);
                import(configJsPathURL)
                    .then((Config) => {
                        this.currentConfig = Object.assign({}, Config.default, environmentConfig);
                        fs.unlinkSync(configJsPath);
                        resolve();
                    })
                    .catch((err) => {
                        fs.unlinkSync(configJsPath);
                        reject(err);
                    });
            } else {
                reject(new Error('File not found !!! ' + configPath));
            }
        });
    };

    convertToUint8Array = (s) => {
        return new Uint8Array(
            atob(s)
                .split('')
                .map((c) => {
                    return c.charCodeAt(0);
                })
        );
    };

    encrypt = (content) => {
        const compressedCode = lz.compressToUint8Array(JSON.stringify(content));
        const secretKey = this.convertToUint8Array(this.currentConfig.SECRET_KEY);
        const signedCode = nacl.sign(compressedCode, secretKey);
        const base64Str = Buffer.from(signedCode).toString('base64');
        return base64Str;
    };

    decrypt = (content) => {
        const publicKey = this.convertToUint8Array(this.currentConfig.PUBLIC_KEY);
        const contentCode = this.convertToUint8Array(content);
        const decompressContent = lz.decompressFromUint8Array(nacl.sign.open(contentCode, publicKey));
        const decompressObj = JSON.parse(decompressContent);
        return decompressObj;
    };

    generate = (noOfDays, btype = 100) => {
        const license = {
            expiry: Math.floor(Date.now() / 1000 + noOfDays * 86400),
            btype,
        };
        const licenseKey = this.encrypt(license);
        return licenseKey;
    };

    parse = (licenseKey) => {
        const license = this.decrypt(licenseKey);
        license.expiry = license.expiry * 1000;
        return license;
    };

    generateNewPassKey = () => {
        nacl.util = naclutil;
        const { secretKey, publicKey } = nacl.sign.keyPair();
        return {
            PUBLIC_KEY: nacl.util.encodeBase64(publicKey),
            SECRET_KEY: nacl.util.encodeBase64(secretKey),
        };
    };
}

export default new LicenseGen();