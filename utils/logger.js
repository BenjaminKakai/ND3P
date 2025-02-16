/**
 * Basic logger utility
 */
const logger = {
    info: (message, ...args) => {
        console.log(new Date().toISOString(), 'INFO:', message, ...args);
    },
    error: (message, ...args) => {
        console.error(new Date().toISOString(), 'ERROR:', message, ...args);
    },
    warn: (message, ...args) => {
        console.warn(new Date().toISOString(), 'WARN:', message, ...args);
    },
    debug: (message, ...args) => {
        if (process.env.NODE_ENV !== 'production') {
            console.debug(new Date().toISOString(), 'DEBUG:', message, ...args);
        }
    }
};

module.exports = logger;