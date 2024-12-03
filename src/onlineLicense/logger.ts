import chalk from 'chalk';

const logger = (msg: string, type: string): void => {
    let tag;

    switch (type) {
        case 'error':
            tag = chalk.bold.bgRed(' error  ');
            break;

        case 'warn':
            tag = chalk.bold.bgYellow(' warn  ');
            break;

        case 'success':
            tag = chalk.bold.bgGreen(' success  ');
            break;

        case 'info':
            tag = chalk.bold.bgCyan(' info  ');
            break;

        default:
            msg = chalk.bold.yellow(msg);
            break;
    }

    const sysout = console;
    !type && sysout.log('');
    sysout.log(`${tag || ''} ${msg}`);
    !type && sysout.log('');
};

export default logger;