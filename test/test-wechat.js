GameGlobal.md5 = require('./js/libs/md5.min.js')
GameGlobal.fpnn = require('./js/libs/fpnn.min.js')
GameGlobal.rum = require('./js/libs/rum.min.js')

let client = new rum.RUMClient({
    pid: 41000005,
    token: 'dd38c76b-91c2-4be1-8607-7b9e860947b1',
    appv: '10.0'
    ssl: true,
    debug: true,
    platformImpl: new fpnn.WechatImpl(),
    platformRum: new rum.WechatRum(false)
});

client.on('error', function (err) {

    console.error('rum error:', err);
});

client.on('close', function () {

    console.log('rum closed!');
});

client.on('ready', function () {

    console.log('rum ready!');
});

client.connect('rum-wss-test-nx.ifunplus.cn:13555');