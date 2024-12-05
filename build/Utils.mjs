/* eslint-disable powerbi-visuals/non-literal-fs-path -- This file is for build purpose only */
import url from 'url';
import fs from 'fs-extra';
import { Readable } from 'stream';
import logger from './logger.mjs';

export class Utils {
    static isEmpty(value) {
        return ['', null, undefined].includes(value);
    }

    static getURL(path) {
        return url.pathToFileURL(path).href;
    }

    static replace(filepath, options) {
        return new Promise((resolve, reject) => {
            const keys = Object.keys(options);
            const replaceMappings = keys.map((key) => {
                const value = options[key];
                return {
                    find: `(\\s*?)${key}:(.*)`,
                    replace: `$1${key}: \`${value}\`,`,
                    regex: true,
                };
            });
            Utils.replaceContent(filepath, replaceMappings)
                .then(() => {
                    resolve();
                })
                .catch(reject);
        });
    }

    static replaceContent(filepath, mappings) {
        return new Promise((resolve, reject) => {
            let readable,
                writable,
                fullContent = '';
            if (fs.existsSync(filepath) === true) {
                readable = fs.createReadStream(filepath);
                readable.on('data', (content) => {
                    fullContent += content.toString();
                });
                readable.on('end', () => {
                    readable.close();
                    mappings.forEach((mapping) => {
                        let regex;
                        if (mapping.regex === true) {
                            regex = new RegExp(mapping.find, 'g');
                            fullContent = fullContent.replace(regex, mapping.replace);
                        } else {
                            fullContent = fullContent.replace(mapping.find, mapping.replace);
                        }
                    });
                    writable = fs.createWriteStream(filepath);
                    readable = Readable.from(fullContent);
                    readable.pipe(writable);
                    writable.on('finish', () => {
                        writable.close();
                        logger('[REPLACE-CONTENT] ' + filepath, 'success');
                        resolve();
                    });
                    writable.on('error', reject);
                });
                readable.on('error', reject);
            } else {
                resolve();
            }
        });
    }

    static removeLines(filepath, mapping) {
        return new Promise((resolve, reject) => {
            let readable,
                fullContent = '';
            if (fs.existsSync(filepath) === true) {
                readable = fs.createReadStream(filepath);
                readable.on('data', (content) => {
                    fullContent += content.toString();
                });
                readable.on('end', () => {
                    readable.close();
                    const writable = fs.createWriteStream(filepath);
                    const lines = fullContent.split('\n');
                    const outputLines = [];
                    let isUnderMatch = false;
                    lines.forEach((line) => {
                        let isMatchingLine = false;
                        if (mapping.regex === true) {
                            const startRegex = new RegExp(mapping.startLine, 'g');
                            if (line.match(startRegex)) {
                                isUnderMatch = true;
                                isMatchingLine = true;
                            }
                            const endRegex = new RegExp(mapping.endLine, 'g');
                            if (isUnderMatch && line.match(endRegex)) {
                                isUnderMatch = false;
                                isMatchingLine = true;
                            }
                        } else {
                            if (line.includes(mapping.startLine)) {
                                isUnderMatch = true;
                                isMatchingLine = true;
                            }
                            if (isUnderMatch && line.includes(mapping.endLine)) {
                                isUnderMatch = false;
                                isMatchingLine = true;
                            }
                        }
                        if (mapping.includeStartAndEndLine && isMatchingLine) {
                            outputLines.push(line);
                        } else if (!mapping.remove && isUnderMatch && !isMatchingLine) {
                            outputLines.push(line);
                        } else if (!isMatchingLine && !isUnderMatch) {
                            outputLines.push(line);
                        }
                    });
                    fullContent = outputLines.join('\n');
                    readable = Readable.from(fullContent);
                    readable.pipe(writable);
                    writable.on('finish', () => {
                        writable.close();
                        resolve();
                    });
                    writable.on('error', reject);
                });
                readable.on('error', reject);
            } else {
                resolve();
            }
        });
    }
}