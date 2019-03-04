'use strict'

class WechatRum {

    constructor(globalHook) {
        
        this._model = '';
        this._brand = '';
        this._pixelRatio = 0;
        this._screenWidth = 0;
        this._screenHeight = 0;
        this._language = '';
        this._version = '';
        this._system = '';
        this._platform = '';

        let self = this;
        this._network = '';

        this._isActive = true;
        globalHook = (globalHook !== undefined) ? globalHook : true;

        this._wx_api = {};
        this._hook = hook.call(this);

        try {

            let res = this._hook.getSystemInfoSync();

            this._model = res.model;
            this._brand = res.brand;
            this._pixelRatio = res.pixelRatio;
            this._screenWidth = res.windowWidth;
            this._screenHeight = res.windowHeight;
            this._language = res.language;
            this._version = res.version;
            this._system = res.system;
            this._platform = res.platform;

            this._storageInfo = this._hook.getStorageInfoSync();
        } catch (e) {}

        if (globalHook && Object.getOwnPropertyNames(this._hook).length != 0) {

            wx = this._hook;
        }

        hookHttp.call(this);
        hookShare.call(this);
    }

    get lang() {

        return this._language;
    }

    get manu() {

        return this._brand;
    }

    get model() {

        return this._model;
    }

    get os() {

        return this._system;
    }

    get osv() {

        return this._system;
    }

    get network() {

        return this._network;
    }

    get isMobile() {

        return true;
    }

    get screenheight() {

        return this._screenHeight;
    }

    get screenwidth() {

        return this._screenWidth;
    }

    get carrier() {

        return null;
    }

    get from() {

        return 'wechat';
    }

    setItem(key, items) {

        let value = null;

        try {

            value = JSON.stringify(items);
        } catch (err) {

            value = items;
        }

        try {

            this._hook.setStorageSync(key, value);
        } catch (err) {

            return false;
        }

        return true;
    }

    getItem(key) {

        let data = null;
        let items = null;

        try {

            items = this._hook.getStorageSync(key);
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

        if (this._storageInfo) {

            let keys = this._storageInfo.keys;

            if (keys.indexOf(key) != -1) {

                try {

                    this._hook.removeStorageSync(key);
                    return true;
                } catch (err) {}
            }
        }

        return false;
    }

    httpRequest(url, callback) {

        httpRequest.call(this, url, callback);
    }

    tryScope() {

        tryScope.call(this);
    }

    addSelfListener(launch_options_callback) {

        addVisibleListener.call(this);
        addNetworkListener.call(this);
        addMemoryWarningListener.call(this);
        addRunningErrorListener.call(this);
        addUpdateListener.call(this);
        tryScope.call(this);

        let launchOptions = null;

        try {

            launchOptions = this._hook.getLaunchOptionsSync();
        } catch (e) {}

        if (launchOptions) {

            launch_options_callback && launch_options_callback(launchOptions)
        }

        getSystemInfo.call(this);
    }

    get tickNow() {

        return tick_now.call(this);
    }
}

function httpRequest(url, callback) {

    if (!this._hook.request) {

        callback && callback(new Error('`wx.request` is undefined!'), null);
        return;
    }

    this._hook.request({

        url: url,
        success: function(res) {

            callback && callback(null, res.data);
        }
    });
}

function addNetworkListener() {

    let self = this;

    if (this._hook.getNetworkType) {

        this._hook.getNetworkType({

            success: function(res) {

                self._network = res.networkType;
                self.emit('network');
            }
        });
    }

    if (this._hook.onNetworkStatusChange) {

        this._hook.onNetworkStatusChange(function(res) {

            let ss = self._network;

            if (res.isConnected) {

                self._network = res.networkType;
            } else {

                self._network = '';
            } 

            self.emit('network_change', { ss: ss, cs: self._network });
        });
    }
}

function addVisibleListener() {

    let self = this;

    if (this._hook.onHide) {

        this._hook.onHide(function() {

            self._isActive = false;
            self.emit('visible_change', false);
        });
    }

    if (this._hook.onShow){

        this._hook.onShow(function(res) {
     
            self._isActive = true;
            self.emit('visible_change', true, res);
        });
    }
}

function addMemoryWarningListener() {

    let self = this;

    if (this._hook.onMemoryWarning) {

        this._hook.onMemoryWarning(function(res) {

            self.emit('memory_warning', res);
        });
    }
}

function addRunningErrorListener() {

    let self = this;

    if (this._hook.onError) {

        this._hook.onError(function(res) {

            self.emit('running_error', res);
        });
    }
}

function addUpdateListener() {

    let self = this;

    if (this._hook.getUpdateManager) {

        let updateManager = this._hook.getUpdateManager();

        updateManager.onCheckForUpdate(function(res) {

            self.emit('check_update', res);
        });

        updateManager.onUpdateReady(function() {

            self.emit('check_update', { status: 'ready' });
        });

        updateManager.onUpdateFailed(function() {

            self.emit('check_update', { status: 'failed' });
        });
    }
}

function tryScope() {

    let self = this;

    if (this._hook.getSetting) {

        this._hook.getSetting({

            success: function(res) {

                let settings = res.authSetting;
                self.emit('auth_setting', settings);

                if (settings['scope.userInfo']) {

                    getUserInfo.call(self);
                }

                if (settings['scope.userLocation']) {
                    
                    getLocation.call(self);
                }
            }
        });
    }
}

function getUserInfo() {

    let self = this;

    if (this._hook.getUserInfo) {

        this._hook.getUserInfo({

            withCredentials: false,
            success: function(res) {

                self.emit('user_info', res.userInfo);
            }
        });
    }
}

function getLocation() {

    let self = this;

    if (this._hook.getLocation) {

        this._hook.getLocation({

            type: 'gcj02',
            altitude: true,
            success: function(res) {

                self.emit('location_gcj02', res);
            }
        });
    }
}

function getSystemInfo() {

    let self = this;

    if (this._hook.getSystemInfo) {

        this._hook.getSystemInfo({

            success: function(res) {

                self.emit('system_info', res);
            }
        });
    }
}

function hook() {

    let hwx = {};
    this._wx_api = wx || {};

    if (typeof wx === 'undefined') {

        return hwx;
    }

    for (let key in this._wx_api) {

        hwx[key] = this._wx_api[key];
    }

    hwx.prototype = this._wx_api.prototype;
    return hwx;
}

function hookHttp() {

    let self = this;

    if (this._wx_api.request) {

        this._hook.request = function(object) {

            let obj = {};
            let tn = tick_now.call(self);

            for (let key in object) {

                obj[key] = object[key];
            }

            obj.complete = function(res) {

                let latency = tick_now.call(self) - tn;
                object.complete && object.complete(res);

                self.emit('http_hook', { req:object, res:res, latency:latency });
            }

            return self._wx_api.request(obj);
        }
    }
}

function hookShare() {

    let self = this;

    if (this._wx_api.onShareAppMessage) {

        this._hook.onShareAppMessage = function(callback) {

            let func = function (res) {

                let obj = (callback && callback(res)) || {};

                let req = {
                    title: obj.title,
                    imageUrl: obj.imageUrl,
                    query: obj.query
                };

                self.emit('share_hook', { type:'wx_onShareAppMessage', res:res, req:req });
                return obj;
            };

            self._wx_api.onShareAppMessage(func);
        };
    }

    if (this._wx_api.shareAppMessage) {

        this._hook.shareAppMessage = function(obj){

            let req = {
                title: obj.title,
                imageUrl: obj.imageUrl,
                query: obj.query
            };

            self.emit('share_hook', { type:'wx_shareAppMessage', req:req });
            self._wx_api.shareAppMessage(obj);
        };
    }
}

function tick_now() {

    //TODO 目前wx.getPerformance().now()在不同平台返回值单位不同, 没有找到适当的判断条件.

    // if (this._hook.getPerformance) {

    //     if (this._platform == 'devtools') {

    //         return Math.round(this._hook.getPerformance().now());
    //     }

    //     return Math.round(this._hook.getPerformance().now() / 1000);
    // }

    return Date.now();
}

module.exports = WechatRum;
