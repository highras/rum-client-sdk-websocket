'use strict'

const FPEvent = require('../fpnn/FPEvent');
const FPClient = require('../fpnn/FPClient');
const RUMProxy = require('./RUMProxy');
const RUMEvent = require('./RUMEvent');
const RUMConfig = require('./RUMConfig');
const PlatFormRum = require('./platform/BrowserRum');

class RUMClient {

    constructor(options) {

        this._cyrMD5 = require('../../libs/md5.min');

        FPEvent.assign(this);

        this._pid = options.pid;
        this._token = options.token;

        this._ping_eid = 0;
        this._ping_latency = 0;
        this._write_count = 0;

        this._midCount = 0;
        this._sendInterval = 0;
        this._pingInterval = 0;

        this._configVersion = 0;

        this._platformImpl = options.platformImpl;
        this._platformRum = options.platformRum || new PlatFormRum();

        FPEvent.assign(this._platformRum);

        this._uid = (options.uid && options.uid.toString()) || '';
        this._appv = options.appv || '';
        this._debug = options.debug || false;
        this._ssl = options.ssl || true;
        
        this._session = 0;
        this._sessionTimestamp = 0;

        this._proxy = null;
        this._baseClient = null;
        this._rumEvent = new RUMEvent(this._pid, this._platformRum, this._debug);

        this._rid = null;
        this._first = true;
    }

    destroy() {

        this._midCount = 0;
        this._ping_eid = 0;
        this._write_count = 0;

        if (this._sendInterval) {

            clearInterval(this._sendInterval);
            this._sendInterval = 0;
        }

        if (this._pingInterval) {

            clearInterval(this._pingInterval);
            this._pingInterval = 0;
        }

        if (this._platformImpl) {

            this._platformImpl.removeEvent();
        }

        if (this._rumEvent) {

            this._rumEvent.destroy();
        }

        this.removeEvent();

        if (this._baseClient) {

            this._baseClient.destroy();
            this._baseClient = null;
        }
    }

    connect(endpoint, clearStorage) {

        if (this._baseClient != null) {

            this.emit('error', new Error('has been init!'));
            return;
        }

        if (clearStorage) {

            this._rumEvent.clearStorage();
        }

        endpoint = buildEndpoint.call(this, endpoint);

        if (this._debug) {

            console.log('[RUM] init: ', endpoint);
        }

        if (this._ssl) {
            
            this._proxy = new RUMProxy(endpoint);
        } 

        openEvent.call(this);
        addPlatformListener.call(this);

        this._baseClient = new FPClient({
            endpoint: endpoint, 
            autoReconnect: true,
            connectionTimeout: RUMConfig.SENT_TIMEOUT,
            proxy: this._proxy,
            platformImpl: this._platformImpl
        });
    
        let self = this;
    
        this._baseClient.on('connect', function() {
    
            if (self._debug) {

                console.log('[RUM] connect on rum agent!');
            }

            if (self._sessionTimestamp) {

                let timeout = self._platformRum.isMobile ? RUMConfig.RESET_OPENEVENT_INTERVAL_MOBILE : RUMConfig.RESET_OPENEVENT_INTERVAL;

                if (Date.now() - self._sessionTimestamp >= timeout) {

                    openEvent.call(self);
                }
            }
            
            self.emit('ready');

            startPing.call(self);
            startSend.call(self);
        });
    
        this._baseClient.on('close', function() {
    
            if (self._debug) {

                console.log('[RUM] close from rum agent!');
            }

            stopPing.call(self);
            stopSend.call(self);

            self.emit('close');
        });
    
        this._baseClient.on('error', function(err) {
            
            if (self._debug) {

                console.log('[RUM] error: ', err);
            }

            self.emit('error', err);
        });
    
        this._baseClient.connect();
    }

    set uid(value) {

        this._uid = value && value.toString();

        if (this._uid) {

            appendUser.call(this, { uid: this._uid }, true);
        }
    }

    customEvent(ev, attrs, strict) {

        let event = {

            'attrs': attrs || {}
        }

        writeEvent.call(this, ev, event, strict);
    }
}

function addPlatformListener() {

    let self = this;

    this._platformRum.addSelfListener(function(launchOptions){

        self.customEvent('launch_options', launchOptions);
    });

    this._platformRum.on('visible_change', function(visible) {

        writeEvent.call(self, visible ? 'fg' : 'bg', {});
    });

    this._platformRum.on('network_change', function(data) {

        writeEvent.call(self, 'nwswitch', { sstate:data.ss, cstate:data.cs });
    });

    this._platformRum.on('network', function() {

        appendUser.call(self, { nw: self._platformRum.network }, true);
    });

    this._platformRum.on('memory_warning', function(data) {

        writeEvent.call(self, 'warn', { type:'wx_memory_warn', level:data.level });
    });

    this._platformRum.on('running_error', function(data) {

        writeEvent.call(self, 'error', { type:'wx_running_error', message:data.message, stack:data.stack });
    });

    this._platformRum.on('update_info', function(data) {

        writeEvent.call(self, 'info', { type:'wx_version_update', hasUpdate:data.hasUpdate, status:data.status }); 
    });

    this._platformRum.on('http_hook', function(data) {

        let event = {

            cstate: self._platformRum.network,
        } 

        if (data) {

            if (data.req) {

                event.url = data.req.url;
                event.method = data.req.method || 'GET';
                event.reqsize = self._rumEvent.sizeof(data.req.data);
            }

            if (data.res) {

                event.status = data.res.statusCode;
                event.attrs = { errMsg:data.res.errMsg };
                event.respsize = self._rumEvent.sizeof(data.res.data);
            }

            event.latency = data.latency || 0;
        }

        if (self._debug) {

            console.log('[RUM] http hook: ', event);
        }

        if (!event.status || event.status >= 300 || event.latency > 500) {

            writeEvent.call(self, 'http', event);
        }
    });
}

function writeEvent(ev, event, strict) {

    strict = strict || false;

    if (!event.eid) {

        event.eid = genMid.call(this);
        this._write_count++;
    }

    event.ev = ev;
    event.pid = this._pid || 0;
    event.sid = this._session || 0; 
    event.uid = this._uid;
    event.rid = getRid.call(this);

    if (!event.ts) {

        if (this._rumEvent.timestamp) {

            event.ts = this._rumEvent.timestamp;
        }
    }

    if (this._debug) {

        console.log('[RUM] write event: ', strict, event);
    }

    this._rumEvent.writeEvent(event, false, strict);
}

function getRid() {

    if (this._rid) {

        return this._rid;
    }

    let rid = 0;
    let key = 'rum_rid_' + this._pid;
    let data = this._platformRum.getItem(key);

    this._first = false;

    if (this._rumEvent.isEmpty(data)) {

        this._first = true;

        rid = uuid.call(this, 0, 16);
        this._platformRum.setItem(key, { rid: rid });
    } else {

        rid = data.rid;
    }

    rid = rid.toString();

    if (rid.indexOf('-') == -1) {

        rid = uuid.call(this, 0, 16);
        this._platformRum.setItem(key, { rid: rid });
    }

    return this._rid = rid;
}

function openEvent() {

    this._session = genMid.call(this);
    this._sessionTimestamp = Date.now();

    let event = {

        ip: '',
        sw: this._platformRum.screenwidth || 0,
        sh: this._platformRum.screenheight || 0
    }

    event.manu = this._platformRum.manu || '';
    event.model = this._platformRum.model || '';
    event.os = this._platformRum.os || '';
    event.osv = this._platformRum.osv || '';
    event.nw = this._platformRum.network || '';
    event.carrier = this._platformRum.carrier || '';
    event.lang = this._platformRum.lang || '';
    event.from = this._platformRum.from || '';
    event.appv = this._appv || '';
    event.first = this._first;
    event.v = RUMConfig.VERSION;
    event.uid = this._uid;
    event.rid = getRid.call(this);

    writeEvent.call(this, 'open', event, true);
}

function loadConfig() {

    if (this._debug) {

        console.log('[RUM] load config...');
    }

    let salt = genSalt.call(this);

    let payload = {
        pid: this._pid,
        sign: genSign.call(this, salt),
        salt: salt
    };

    payload.uid = this._uid;
    payload.rid = getRid.call(this);

    payload.lang = this._platformRum.lang || '';
    payload.manu = this._platformRum.manu || '';
    payload.model = this._platformRum.model || '';
    payload.os = this._platformRum.os || '';
    payload.osv = this._platformRum.osv || '';
    payload.nw = this._platformRum.network || '';
    payload.carrier = this._platformRum.carrier || '';
    payload.from = this._platformRum.from || '';
    payload.appv = this._appv || '';

    let options = {
        flag: 0,
        method: 'getconfig',
        payload: JSON.stringify(payload)
    };

    let self = this;

    sendQuest.call(this, this._baseClient, options, function(err, data) {

        if (err) {

            self._configversion = 0;
            self.emit('error', err);
            return;
        }

        if (self._debug) {

            console.log('[RUM] load config:', data);
        }

        self._rumEvent.updateConfig(data['events']);
    }, RUMConfig.SENT_TIMEOUT);
}

function startPing() {

    ping.call(this);

    let self = this;

    if (this._pingInterval) {

        return;
    }

    this._pingInterval = setInterval(function() {

        ping.call(self);
    }, RUMConfig.PING_INTERVAL);
}

function ping() {

    if (this._debug) {

        console.log('[RUM] ping...');
    }

    let ping_eid = this._ping_eid;
    let write_count = this._write_count;

    this._write_count = 0;
    this._ping_eid = genMid.call(this);

    let salt = genSalt.call(this);

    let payload = {
        pid: this._pid,
        sign: genSign.call(this, salt),
        salt: salt
    };

    payload.uid = this._uid;
    payload.rid = getRid.call(this);

    payload.sid = this._session || 0;
    payload.cv = this._configVersion || 0;
    payload.pt = this._ping_latency || 0;
    payload.ss = this._rumEvent.storageSize || 0;
    payload.wc = write_count;
    payload.feid = ping_eid;
    payload.teid = this._ping_eid;

    let options = {
        flag: 0,
        method: 'ping',
        payload: JSON.stringify(payload)
    };

    let self = this;
    let pingTime = this._platformRum.tickNow;

    sendQuest.call(this, this._baseClient, options, function(err, data) {

        self._ping_latency = self._platformRum.tickNow - pingTime;

        if (err) {

            self.emit('error', err);
            return;
        }

        self._rumEvent.timestamp = +(data['ts']);
        self._rumEvent.sizeLimit = +(data['bw']);

        if (self._debug) {

            console.log('[RUM] ping:', self._configVersion, data);
        }

        if (self._configVersion != +data['cv'] || (+data['cv'] == 0 && !self._rumEvent.rumConfig)) {

            self._configVersion = +data['cv'];
            loadConfig.call(self);
        }
    }, RUMConfig.PING_INTERVAL);
}

function stopPing() {

    if (this._pingInterval) {

        clearInterval(this._pingInterval);
        this._pingInterval = 0;
    }
}

function sendEvents(events) {

    let salt = genSalt.call(this);

    let payload = {
        sign: genSign.call(this, salt),
        salt: salt,
        pid: this._pid,
        events: events
    };

    let options = {

        flag: 0,
        method: 'adds',
        payload: JSON.stringify(payload)
    };

    let self = this;

    sendQuest.call(this, this._baseClient, options, function(err, data) {

        self._rumEvent.clearStorageEvents(events);

        if (err) {

            self.emit('error', err);
            self._rumEvent.writeEvents(events, true);
            return;
        }
    }, RUMConfig.SENT_TIMEOUT);
}

function startSend() {

    if (this._sendInterval) {

        return;
    }

    let self = this;

    this._sendInterval = setInterval(function() {

        let events = self._rumEvent.getSentEvents();

        if (events.length) {

            if (self._debug) {

                console.log('[rum] will be sent! ', events);
            }

            sendEvents.call(self, events);
        }
    }, 1000);
}

function stopSend() {

    if (this._sendInterval) {

        clearInterval(this._sendInterval);
        this._sendInterval = 0;
    }
}

function appendUser(event, delay) {

    let self = this;

    if (!event.sid) {

        event.sid = this._session || 0;
    }

    if (!event.pid) {

        event.pid = this._pid || 0;
    }

    if (!event.ts) {

        if (!this._rumEvent.timestamp) {

            setTimeout(function() {

                appendUser.call(self, event, true);
            }, 10 * 1000);
            return;
        }

        event.ts = this._rumEvent.timestamp;
    }

    if (this._debug) {

        console.log('[RUM] append user info.', delay, event);
    }

    let salt = genSalt.call(this);

    for (let key in event) {

        if (!event[key] || event[key].length == 0) {

            delete event[key];
        }
    }

    let payload = {
        sign: genSign.call(this, salt),
        salt: salt,
        user: event 
    };

    let options = {

        flag: 0,
        method: 'append',
        payload: JSON.stringify(payload)
    };

    sendQuest.call(this, this._baseClient, options, function(err, data) {

        if (err) {

            self.emit('error', err);
            return;
        }

        // TODO log print
    }, RUMConfig.SENT_TIMEOUT);

    if (delay) {

        delayAppend.call(this, event);
    }
}

function delayAppend(event) {

    let self = this;

    setTimeout(function(args) {

        appendUser.call(self, event, false);
    }, 10 * 1000);   
}

function buildEndpoint(endpoint) {
    
    if (this._proxy) {

        return endpoint;
    }

    let protol = 'ws://';

    if (this._ssl) {

        protol = 'wss://';
    }

    return protol + endpoint + '/service/websocket';
}

function genMid() {

    if (++this._midCount >= 999) {

        this._midCount = 0;
    }

    return +(Date.now().toString() + this._midCount);
}

function genSign(salt) {

    return this._cyrMD5(this._pid + ':' + this._token + ':' + salt).toUpperCase();
}

function genSalt() {

    return +(Date.now().toString());
}

function isException(isAnswerErr, data) {

    if (!data) {

        return new Error('data is null!');
    }

    if (data instanceof Error) {

        return data;
    }

    if (isAnswerErr) {

        if (data.code && data.ex) {

            return new Error('code: ' + data.code + ', ex: ' + data.ex);
        }
    }

    return null;
}

function sendQuest(client, options, callback, timeout) {

    let self = this;

    if (!client) {

        callback && callback(new Error('client is null!'), null);
        return;
    }

    client.sendQuest(options, function(data) {
        
        if (!callback) {

            return;
        }

        let err = null;
        let isAnswerErr = false;

        if (data.payload) {

            let payload = JSON.parse(data.payload);

            if (data.mtype == 2) {

                isAnswerErr = data.ss != 0;
            }

            err = isException.call(self, isAnswerErr, payload);

            if (err) {

                callback(err, null);
                return;
            }

            callback(null, payload);
            return;
        }

        err = isException.call(self, isAnswerErr, data);

        if (err) {

            callback(data, null);
            return;
        }

        callback(null, data);
    }, timeout);
}

function uuid(len, radix) {

    let chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');
    let uuid = [], i;

    radix = radix || chars.length;
 
    if (len) {

        // Compact form
        for (i = 0; i < len; i++) {

            uuid[i] = chars[ 0 | Math.random() * radix ];
        }
    } else {

        // rfc4122, version 4 form
        let r;
 
        // rfc4122 requires these characters
        uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
        uuid[14] = '4';
 
        // Fill in random data.  At i==19 set the high bits of clock sequence as
        // per rfc4122, sec. 4.1.5
        for (i = 0; i < 36; i++) {

            if (!uuid[i]) {

                r = 0 | Math.random() * 16;
                uuid[i] = chars[ (i == 19) ? (r & 0x3) | 0x8 : r ];
            }
        }

        // add timestamp(ms) at prefix
        let ms = Date.now().toString();

        for (i = 0; i < ms.length; i++) {

            uuid[i] = ms.charAt(i);
        }
    }
 
    return uuid.join('');
}

module.exports = RUMClient;