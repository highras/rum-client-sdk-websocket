'use strict'

const RUMProxy = require('./RUMProxy');
const RUMEvent = require('./RUMEvent');
const RUMConfig = require('./RUMConfig');
const PlatFormRum = require('./platform/BrowserRum');

class RUMClient {

    constructor(options) {

        fpnn.FPEvent.assign(this);

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

        fpnn.FPEvent.assign(this._platformRum);

        this._uid = (options.uid && options.uid.toString()) || '';
        this._appv = options.appv || '';
        this._debug = options.debug || false;
        this._ssl = options.ssl || true;

        this._md5 = options.md5 || null;
        
        this._session = 0;

        this._proxy = null;
        this._baseClient = null;
        this._rumEvent = new RUMEvent(this._pid, this._platformRum, this._debug);
    }

    destroy() {

        this._session = 0;
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

        this._baseClient = new fpnn.FPClient({
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

    get session() {

        return this._session;
    }

    get rumId() {

        return this._rumEvent.rumId;
    }

    set uid(value) {

        this._uid = value && value.toString();

        if (this._uid) {

            append.call(this, 'uid', { uid: this._uid });
            this._platformRum.tryScope();
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

    this._platformRum.on('visible_change', function(visible, res) {

        writeEvent.call(self, visible ? 'fg' : 'bg', {});

        if (res) {

            writeEvent.call(self, 'info', { type:'wx_on_show', options:res });
        }
    });

    this._platformRum.on('network_change', function(data) {

        writeEvent.call(self, 'nwswitch', { sstate:data.ss, cstate:data.cs });
    });

    this._platformRum.on('network', function() {

        append.call(self, 'nw', { nw: self._platformRum.network });
    });

    this._platformRum.on('memory_warning', function(data) {

        writeEvent.call(self, 'warn', { type:'wx_memory_warn', level:data.level });
    });

    this._platformRum.on('running_error', function(data) {

        writeEvent.call(self, 'error', { type:'wx_running_error', message:data.message, stack:data.stack });
    });

    this._platformRum.on('check_update', function(data) {

        writeEvent.call(self, 'info', { type:'wx_check_update', hasUpdate:data.hasUpdate, status:data.status }); 
    });

    this._platformRum.on('auth_setting', function(data) {

        writeEvent.call(self, 'info', { type:'wx_auth_setting', settings:data });
    });

    this._platformRum.on('user_info', function(data) {

        writeEvent.call(self, 'info', { type:'wx_user_info', userInfo:data }); 
    });

    this._platformRum.on('location_gcj02', function(data) {

        writeEvent.call(self, 'info', { type:'wx_location_gcj02', location:data }); 
    });

    this._platformRum.on('system_info', function(data) {

        writeEvent.call(self, 'info', { type:'wx_system_info', systemInfo:data }); 
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


        writeEvent.call(self, 'http', event);

        if (!event.status || event.status >= 300) {

            delete event.ev;
            delete event.eid;

            writeEvent.call(self, 'httperr', event);
            return;
        } 

        if (event.latency > 1000) {

            delete event.ev;
            delete event.eid;

            writeEvent.call(self, 'httplat', event);
            return;
        }
    });

    this._platformRum.on('share_hook', function(data) {

        writeEvent.call(self, 'info', data); 
    });

    this._platformRum.addSelfListener(function(launchOptions){

        writeEvent.call(self, 'info', { type:'wx_launch_options', options:launchOptions });
        self.customEvent('launch_options', launchOptions);
    });
}

function writeEvent(ev, event, strict) {

    event.ev = ev;
    strict = strict || false;

    if (!event.eid) {

        event.eid = genMid.call(this);
        this._write_count++;
    }

    if (!event.pid) {

        event.pid = this._pid || 0;
    }

    if (!event.sid) {

        event.sid = this._session || 0; 
    }

    if (!event.uid) {

        event.uid = this._uid;
    }

    if (!event.rid) {

        event.rid = this._rumEvent.rumId;
    }

    if (!event.ts) {

        event.ts = this._rumEvent.timestamp;
    }

    let cp_event = {};

    for (let key in event) {

        cp_event[key] = event[key];
    }

    cp_event.prototype = event.prototype;

    if (this._debug) {

        console.log('[RUM] write event: ', strict, cp_event);
    }

    this._rumEvent.writeEvent(cp_event, strict);
}

function openEvent() {

    if (this._session) {

        return;
    }

    this._session = genMid.call(this);

    let event = {

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
    event.v = RUMConfig.VERSION;
    event.first = this._rumEvent.isFirst;

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
    payload.rid = this._rumEvent.rumId;

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

    let self = this;

    if (this._pingInterval) {

        return;
    }

    ping.call(this);

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
    payload.rid = this._rumEvent.rumId;

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

        if (self._configVersion != +data['cv'] || (+data['cv'] == 0 && !self._rumEvent.hasConfig)) {

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

        self._rumEvent.removeFromCache(events);

        if (err) {

            self.emit('error', err);
            self._rumEvent.writeEvents(events);
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

                console.log('[RUM] will be sent! ', events);
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

function append(type, event) {

    event.type = type && type.toString();
    writeEvent.call(this, 'append', event, (event.type == 'uid'));
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

    return md5_encode.call(this, this._pid + ':' + this._token + ':' + salt);
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

function md5_encode(str) {

    if (this._md5) {

        return this._md5(str).toUpperCase();
    }

    return md5(str).toUpperCase();
}

module.exports = RUMClient;