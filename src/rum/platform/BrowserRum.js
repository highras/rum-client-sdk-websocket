'use strict'

class BrowserRum {

    constructor() {

        this._ua = UAParser();
    }

    get lang() {

        return navigator.language;
    }

    get manu() {

        return this._ua.device.vendor || navigator.vendor;
    }

    get model() {

        return this._ua.device.model || this._ua.browser.name;
    }

    get os() {

        return this._ua.os.name;
    }

    get osv() {

        return this._ua.os.version;
    }

    get network() {

        return navigator.connection && navigator.connection.effectiveType;
    }

    get isMobile() {

        return this._ua.device.type === 'mobile';
    }

    get screenheight() {

        return screen.height;
    }

    get screenwidth() {

        return screen.width;
    }

    get carrier() {

        return null;
    }

    get from() {

        return null;
    }

    setItem(key, items) {

        let value = null;

        try {

            value = JSON.stringify(items);
        } catch (err) {

            value = items;
        }

        try {

            localStorage.setItem(key, value);
        } catch (err) {

            return false;
        }

        return true;
    }

    getItem(key) {

        let data = null;
        let items = null;

        try {

            items = localStorage.getItem(key);
        } catch (err) {}

        if (!items) {

            items = {};
        }

        try {

            data = JSON.parse(items);
        } catch (err) {

            data = items;
        }

        return data;
    }

    removeItem(key) {

        if (localStorage) {

            if (localStorage.hasOwnProperty(key)) {

                try {

                    localStorage.removeItem(key);
                    return true;
                } catch (err) {}
            }
        }

        return false;
    }

    httpRequest(url, callback) {

        httpRequest.call(this, url, callback);
    }

    tryScope() {}

    addSelfListener() {

        addVisibleListener.call(this);
    }

    get tickNow() {

        return tick_now.call(this);
    }
}

function httpRequest(url, callback) {

    let xhr = new XMLHttpRequest();

    if (xhr) {

        xhr.open('GET', url, true);
        xhr.onload = function (){

            let responseObj = JSON.parse(xhr.responseText);

            if (xhr.readyState == 4 && xhr.status == '200') {

                callback && callback(null, responseObj);
            } 
        }

        xhr.send(null);
    }
}

function addVisibleListener() {

    let self = this;
    
    // 各种浏览器兼容
    let hidden, state, visibilityChange; 

    if (typeof document.hidden !== "undefined") {

        hidden = "hidden";
        visibilityChange = "visibilitychange";
        state = "visibilityState";
    } else if (typeof document.mozHidden !== "undefined") {

        hidden = "mozHidden";
        visibilityChange = "mozvisibilitychange";
        state = "mozVisibilityState";
    } else if (typeof document.msHidden !== "undefined") {

        hidden = "msHidden";
        visibilityChange = "msvisibilitychange";
        state = "msVisibilityState";
    } else if (typeof document.webkitHidden !== "undefined") {

        hidden = "webkitHidden";
        visibilityChange = "webkitvisibilitychange";
        state = "webkitVisibilityState";
    }

    // 添加监听器
    document.addEventListener(visibilityChange, function() {

        self.emit('visible_change', document[hidden] ? false : true);
    }, false);
}

function tick_now() {

    //TODO 目前performance.now()在不同平台返回值单位不同, 没有找到适当的判断条件.
    
    // if (performance) {

    //     return Math.round(performance.now());
    // }

    return Date.now();
}

module.exports = BrowserRum;
