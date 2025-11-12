import chalk from 'chalk';

const logLevels = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

const currentLogLevel = process.env.LOG_LEVEL || 'info';

const log = (level, message, context) => {
    if (logLevels[level] >= logLevels[currentLogLevel]) {
        const timestamp = new Date().toISOString();
        const contextString = context ? chalk.gray(JSON.stringify(context)) : '';
        const levelString = {
            debug: chalk.gray('DEBUG'),
            info: chalk.green('INFO'),
            warn: chalk.yellow('WARN'),
            error: chalk.red('ERROR'),
        }[level];

        console.log(`[${chalk.cyan(timestamp)}] [${levelString}] ${message} ${contextString}`);
    }
};

export const logDebug = (message, context) => log('debug', message, context);
export const logInfo = (message, context) => log('info', message, context);
export const logWarn = (message, context) => log('warn', message, context);
export const logError = (message, context) => log('error', message, context);

export default {
    logDebug,
    logInfo,
    logWarn,
    logError,
};
