'use strict'

const RUMConfig = require('./RUMConfig');

const EVENT_CACHE = 'event_cache';
const EVENT_MAP_0 = 'event_map_0';
const EVENT_MAP_1 = 'event_map_1';
const EVENT_MAP_2 = 'event_map_2';
const EVENT_MAP_3 = 'event_map_3';

const DEFAULT_CONF = { '1': [ 'crash', 'error', 'nwswitch', 'open', 'warn', 'append'] };

class RUMEvent {

    constructor(pid, platformRum, debug) {

        this._rumId = null;
        this._events = null;
        this._isFirst = false;

        this._config = DEFAULT_CONF;
        this._hasConf = false;

        this._debug = debug;

        this._timestamp = 0; 
        this._secondInterval = 0;

        this._delayCount = 0;
        this._platformRum = platformRum;

        this._rum_id_storage = 'rum_rid_' + pid;
        this._rum_events_storage = 'rum_events_' + pid;

        this._storageSize = 0;
        this._storageTimeout = 0;
        
        this._sizeLimit = RUMConfig.SENT_SIZE_LIMIT;

        loadEvents.call(this);
        startSecond.call(this);
    }

    updateConfig(value) {

        this._config = value;
        this._hasConf = true;

        let event_map = getEventMap.call(this, EVENT_MAP_0);

        for (let key in event_map) {

            let storageKey = selectKey.call(this, key);

            if (storageKey) {

                let event_storage = getEventMap.call(this, storageKey);

                if (event_storage[key]) {

                    event_storage[key] = event_map[key].concat(event_storage[key]);
                } else {

                    event_storage[key] = event_map[key];
                }
            } else {

                if (this._debug) {

                    console.log('[RUM] disable event & will be discard!', event_map[key]);
                } 
            }

            delete event_map[key];
        }

        setEventMap.call(this, EVENT_MAP_0, event_map);

        let event_cache = getEventMap.call(this, EVENT_CACHE);

        if (!isEmpty.call(this, event_cache)) {

            for (let key in event_cache) {

                this.writeEvent(event_cache[key]);
            }
        }

        setEventMap.call(this, EVENT_CACHE, {});
    }

    writeEvent(event, strict) {

        let key = event.ev;
        let storageKey = selectKey.call(this, key);

        if (storageKey) {

            let event_storage = getEventMap.call(this, storageKey);

            if (!event_storage[key]) {
                        
                event_storage[key] = [];
            }

            if (event_storage[key].length >= RUMConfig.EVENT_QUEUE_LIMIT){

                if (this._debug) {

                    console.log('[RUM] event(normal) queue limit & will be shift!', event); 
                }

                event_storage[key].shift(); 
            }

            event_storage[key].push(event);
            setEventMap.call(this, storageKey, event_storage);
        } else {

            if (this._debug) {

                console.log('[RUM] disable event & will be discard!', key);
            } 
        }

        if (strict) {

            this._platformRum.setItem(this._rum_events_storage, this._events);
        }
    }

    writeEvents(events) {

        for (let key in events) {

            this.writeEvent(events[key]);
        }
    }

    clearStorage() {

        this._events = {};
        this._platformRum.setItem(this._rum_events_storage, {});
    }

    removeFromCache(events) {

        let event_cache = getEventMap.call(this, EVENT_CACHE);

        for (let key in events) {

            delete event_cache[events[key].eid];
        }

        setEventMap.call(this, EVENT_CACHE, event_cache);
    }

    getSentEvents() {

        let event_res = { size:0, events:[] };

        shiftEvents.call(this, event_res, EVENT_MAP_1);

        if (event_res.size >= this._sizeLimit) {

            return event_res.events;
        }

        shiftEvents.call(this, event_res, EVENT_MAP_2);

        if (event_res.size >= this._sizeLimit) {

            return event_res.events;
        }

        shiftEvents.call(this, event_res, EVENT_MAP_3);

        if (event_res.size >= this._sizeLimit) {

            return event_res.events;
        }

        return event_res.events;
    }

    isEmpty(obj) {

        return isEmpty.call(this, obj);
    }

    destroy() {

        if (this._secondInterval) {

            clearInterval(this._secondInterval);
            this._secondInterval = 0;
        }

        if (this._storageTimeout) {

            clearTimeout(this._storageTimeout);
            this._storageTimeout = 0;
        }

        this._rumId = null;
        this._events = null;
        this._isFirst = false;
        
        this._config = DEFAULT_CONF;
        this._hasConf = false; 

        this._delayCount = 0;

        if (this._platformRum) {

            this._platformRum = null;
        }
    }

    set timestamp(value) {

        if (this._secondInterval) {

            clearInterval(this._secondInterval);
            this._secondInterval = 0;
        }

        if (value < this._timestamp) {

            this._delayCount = this._timestamp - value;
        }else {

            this._timestamp = value;
        }

        startSecond.call(this);
    }

    get timestamp() {

        return this._timestamp;
    }

    get storageSize() {

        return this._storageSize;
    }

    get hasConfig() {

        return this._hasConf;
    }

    set sizeLimit(value) {

        if (value > 0) {

            this._sizeLimit = value;
        }
    }

    get isFirst() {

        if (!this._rumId) {

            getRumId.call(this);
        }

        if (this._isFirst) {

            this._isFirst = false;
            return true;
        }

        return false;
    }

    get rumId() {

        if (!this._rumId) {

            return getRumId.call(this);
        }

        return this._rumId;
    }

    sizeof(data) {

        if (!data) {

            return 0;
        }

        if (Object.prototype.toString.call(data) === '[object String]') {

            return sizeof.call(this, data);
        } 

        if (Object.prototype.toString.call(data) === '[object ArrayBuffer]') {

            return data.byteLength;
        }

        try {

            return sizeof.call(this, JSON.stringify(data));
        }catch(err) {}

        return 0;
    }
}

function getRumId() {

    let rum_id = uuid.call(this, 0, 16);
    let obj = this._platformRum.getItem(this._rum_id_storage);

    if (obj.rid) {

        rum_id = obj.rid.toString();
    } else {

        this._isFirst = true;
        this._platformRum.setItem(this._rum_id_storage, { rid: rum_id });
    }

    return this._rumId = rum_id;
}

function getEventMap(event_map_key) {

    if (!this._events[event_map_key]) {

        this._events[event_map_key] = {};
    }

    return this._events[event_map_key];
}

function setEventMap(event_map_key, event_map_value) {

    this._events[event_map_key] = event_map_value;
}

function loadEvents() {

    this._events = this._platformRum.getItem(this._rum_events_storage);

    storageEvents.call(this);
}

function storageEvents() {

    let self = this;

    this._storageSize = sizeof.call(this, JSON.stringify(this._events));
    let storageDelay = RUMConfig.LOCAL_STORAGE_DELAY * Math.ceil(this._storageSize / this._sizeLimit);

    if (this._storageSize > RUMConfig.STORAGE_SIZE_LIMIT) {

        this._platformRum.setItem(this._rum_events_storage, {});
    } else {

        this._platformRum.setItem(this._rum_events_storage, this._events);
    }

    if (this._storageTimeout) {

        clearTimeout(this._storageTimeout);
        this._storageTimeout = 0;
    }

    this._storageTimeout = setTimeout(function() {

        storageEvents.call(self);
    }, storageDelay);
}

function isEmpty(obj) {

    if (!obj) {

        return true;
    }

    if (obj == undefined) {

        return true;
    }

    if (Object.prototype.toString.call(obj) === '[object String]') {

        return obj == '';
    }

    if (Object.prototype.toString.call(obj) === '[object Array]') {

        return obj.length == 0;
    }

    if (Object.prototype.toString.call(obj) === '[object Object]') {

        return Object.getOwnPropertyNames(obj).length == 0;
    }

    return false;
}

function shiftEvents(event_res, event_map_key) {

    let events = getEventMap.call(this, event_map_key);

    if (isEmpty.call(this, events)) {

        return;
    }

    let event_cache = getEventMap.call(this, EVENT_CACHE);

    if (!this._rumId) {

        getRumId.call(this);
    }

    for (let key in events) {

        while (events[key].length && event_res.size < this._sizeLimit) {

            let event = events[key].shift();

            if (!event.ts) {

                event.ts = this._timestamp;
            }

            if (!event.rid) {

                event.rid = this._rumId;
            }

            for (let key in event) {

                if (Object.prototype.toString.call(event[key]) === '[object Boolean]') {

                    continue;
                }
                
                if (!event[key] || event[key].length == 0) {

                    delete event[key];
                }
            }

            event_res.events.push(event);
            event_cache[event.eid] = event;

            event_res.size += sizeof.call(this, JSON.stringify(event));
        }

        if (events[key].length == 0) {

            delete events[key];
        }

        if (event_res.size >= this._sizeLimit) {

            break;
        }
    }

    setEventMap.call(this, event_map_key, events);
}

function sizeof(str) {

    let byteLen = 0;
    let charCode = null;

    for (let i = 0; i < str.length; i++) {

        charCode = str.charCodeAt(i);

        if (charCode <= 0x007f) {

            byteLen += 1;
        } else if (charCode <= 0x07ff) {

            byteLen += 2;
        } else if (charCode <= 0xffff) {

            byteLen += 3;
        } else {

            byteLen += 4;
        }
    }

    return byteLen;
}

function selectKey(innerKey) {

    if (this._config['1'] && this._config['1'].indexOf(innerKey) > -1) {

        return EVENT_MAP_1;
    }
    
    if (this._config['2'] && this._config['2'].indexOf(innerKey) > -1) {

        return EVENT_MAP_2;
    }

    if (this._config['3'] && this._config['3'].indexOf(innerKey) > -1) {

        return EVENT_MAP_3;
    }

    if (this._hasConf) {

        return null;
    }

    return EVENT_MAP_0;
}

function startSecond() {

    if (!this._timestamp) {

        return;
    }

    if (this._secondInterval) {

        return;
    }
    
    let self = this;

    this._secondInterval = setInterval(function() {

        if (self._delayCount) {

            self._delayCount--;
        }else{

            self._timestamp++;
        }
    }, 1000);
}

function uuid(len, radix) {

    let chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');
    let uuid_chars = [];

    radix = radix || chars.length;
 
    if (len) {

        // Compact form
        for (let i = 0; i < len; i++) {

            uuid_chars[i] = chars[ 0 | Math.random() * radix ];
        }
    } else {

        // rfc4122, version 4 form
        let r;
 
        // rfc4122 requires these characters
        uuid_chars[8] = uuid_chars[13] = uuid_chars[18] = uuid_chars[23] = '-';
        uuid_chars[14] = '4';
 
        // Fill in random data.  At i==19 set the high bits of clock sequence as
        // per rfc4122, sec. 4.1.5
        for (let i = 0; i < 36; i++) {

            if (!uuid_chars[i]) {

                r = 0 | Math.random() * 16;
                uuid_chars[i] = chars[ (i == 19) ? (r & 0x3) | 0x8 : r ];
            }
        }

        // add timestamp(ms) at prefix
        let ms = Date.now().toString();

        for (let i = 0; i < ms.length; i++) {

            uuid_chars[i] = ms.charAt(i);
        }
    }
 
    return uuid_chars.join('');
}

module.exports = RUMEvent;