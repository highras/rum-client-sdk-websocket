'use strict'

function test(endpoint, pid, token, uid) {

    let client = new rum.RUMClient({
        pid: pid,
        token: token,
        uid: uid,
        appv: '10.0.0',
        ssl: true,
        debug: true
    });

    client.on('error', function(err) {

        console.error(err);
    });

    client.on('close', function() {

        console.log('closed!');
    });

    client.on('ready', function() {

        console.log('ready!');
        sendCustomEvent.call(client);
    });

    client.connect(endpoint, false);
}

function sendCustomEvent() {
    
    let attrs = {

        debug: 'this is a custom event'
    }

    this.customEvent('MY_EVENT', attrs);
}
