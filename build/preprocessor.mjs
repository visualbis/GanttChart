/* eslint-disable  -- This file is for build purpose only */
import fs from 'fs-extra';
import path from 'path';
import { Utils } from './Utils.mjs';

class Preprocessor {
    getPreprocessFiles(filepath) {
        const allowedFiles = ['.ts', '.tsx'];
        const state = fs.lstatSync(filepath),
            result = [];

        if (state.isFile() === true) {
            if (allowedFiles.includes(path.extname(filepath).toLowerCase())) {
                result.push(filepath);
            }
        } else if (state.isDirectory() === true) {
            fs.readdirSync(filepath).forEach((item) => {
                Array.prototype.push.apply(result, this.getPreprocessFiles(path.join(filepath, item)));
            });
        }

        return result;
    }

    applyPreprocessOnFile(preprocessFile, context, keys) {
        return new Promise((resolve, reject) => {
            if (keys.length > 0) {
                const key = keys.pop();
                const value = context[key];
                Utils.removeLines(preprocessFile, {
                    startLine: `^(\\s*?)//(\\s*?)@ifdef\\s*${key}(\\s*?)$`,
                    endLine: `^(\\s*?)\/\/\\s*?@endif\\s*?$`,
                    includeStartAndEndLine: false,
                    remove: !value,
                    regex: true,
                })
                    .then(() => {
                        this.applyPreprocessOnFile(preprocessFile, context, keys).then(resolve).catch(reject);
                    })
                    .catch(reject);
            } else {
                resolve();
            }
        });
    }

    applyPreprocessOnFiles(preprocessFiles, context) {
        return new Promise((resolve, reject) => {
            if (preprocessFiles.length > 0) {
                const preprocessFile = preprocessFiles.pop();
                const keys = Object.keys(context);
                this.applyPreprocessOnFile(preprocessFile, context, keys)
                    .then(() => {
                        this.applyPreprocessOnFiles(preprocessFiles, context).then(resolve).catch(reject);
                    })
                    .catch(reject);
            } else {
                resolve();
            }
        });
    }

    apply(inputPath, context) {
        return new Promise((resolve, reject) => {
            const preprocessFiles = this.getPreprocessFiles(inputPath);
            this.applyPreprocessOnFiles(preprocessFiles, context).then(resolve).catch(reject);
        });
    }
}

export default new Preprocessor();
