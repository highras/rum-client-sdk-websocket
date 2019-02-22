'use strict'

class RUMConfig {

    static get VERSION() {

        return '1.0.17';
    }
    
    static get PING_INTERVAL() {

        return 20 * 1000;
    }

    static get SENT_TIMEOUT() {

        return 20 * 1000;
    }

    static get EVENT_QUEUE_LIMIT() {

        return 1 * 1000;
    }

    static get STORAGE_SIZE_LIMIT() {

        return 2 * 1024 * 1024;
    }

    static get LOCAL_STORAGE_DELAY() {

        return 1 * 1000;
    }

    static get SENT_SIZE_LIMIT() {

        return 15 * 1024;
    }
}

module.exports = RUMConfig;