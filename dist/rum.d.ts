declare module rum {
    export class RUMClient {
        constructor(options);
        destroy();
        connect(endpoint, clearStorage);
        session;
        rumId;
        uid;
        customEvent(ev, attrs, strict);
        on(type, callback);
        emit();
        removeEvent();
    }

    export class RUMConfig {
        static VERSION;
        static PING_INTERVAL;
        static SENT_TIMEOUT;
        static RESET_OPENEVENT_INTERVAL;
        static RESET_OPENEVENT_INTERVAL_MOBILE;
        static EVENT_QUEUE_LIMIT;
        static STORAGE_SIZE_LIMIT;
        static LOCAL_STORAGE_DELAY;
        static SENT_SIZE_LIMIT;
    }
    
    export class RUMEvent {
        constructor(pid, platformRum, debug);
        updateConfig(value);
        writeEvent(event, strict);
        writeEvents(events);
        clearStorage();
        removeFromCache(events);
        getSentEvents();
        isEmpty(obj);
        sizeof(data);
        destroy();
        timestamp;
        storageSize;
        hasConfig;
        sizeLimit;
        isFirst;
        rumId;
    }

    export class RUMProxy {
        constructor(endpoint);
        endpoint;
        targetEndpoint;
        buildProxyData(data);
    }

    export class BrowserRum {
        constructor();
        lang;
        manu;
        model;
        os;
        osv;
        network;
        isMobile;
        screenheight;
        screenwidth;
        carrier;
        from;
        setItem(key, items);
        getItem(key);
        removeItem(key);
        httpRequest(url, callback);
        addSelfListener();
        tickNow;
        on(type, callback);
        emit();
        removeEvent();
    }

    export class WechatRum {
        constructor(globalHook);
        lang;
        manu;
        model;
        os;
        osv;
        network;
        isMobile;
        screenheight;
        screenwidth;
        carrier;
        from;
        setItem(key, items);
        getItem(key);
        removeItem(key);
        httpRequest(url, callback);
        addSelfListener();
        tickNow;
        on(type, callback);
        emit();
        removeEvent();
    }
}