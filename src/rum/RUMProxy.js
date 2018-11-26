'use strict'

class RUMProxy {

    constructor(endpoint) {

        this._endpoint = endpoint;
        this._targetEndpoint = null;
    }

    get endpoint() {

        return this._endpoint;
    }

    get targetEndpoint() {

        return this._targetEndpoint;
    }

    set targetEndpoint(value) {

        this._targetEndpoint = value;
    }

    buildProxyData(data) {

        return JSON.stringify({ endpoint: this._targetEndpoint, data: data });
    }
}

module.exports = RUMProxy;