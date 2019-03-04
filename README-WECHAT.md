# fpnn rum sdk websocket #

* 不支持`FPNN`加密链接, 支持`SSL`加密链接
* 支持源码方式接入, 支持自定义构建

#### 关于三方包依赖 ####
* [fpnn](https://github.com/highras/fpnn-sdk-webjs) `./libs/fpnn.min.js`
* [md5](https://github.com/emn178/js-md5) `./libs/md5.min.js`

#### Promise支持 ####
* 支持动态转Promise接口
* 参考:[Promise.promisifyAll](http://bluebirdjs.com/docs/api/promise.promisifyall.html)

#### 关于编译 ####
* 支持源码编译[详见: `./webpack.config.js` `./package.json`]
* 编译依赖的模块[`babel-loader` `babel-preset-es2015` `webpack` `webpack-cli`]
* 编译内置的模块[`buffer`]
```
yarn run build
```

#### 一个例子 ####
* 参考 `./test/test-wechat.js`
```javascript
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
    platformRum: new rum.WechatRum()
});

client.on('error', function (err) {

    console.error('rum error:', err);
});

client.on('close', function () {

    console.log('rum closed!');
});

client.on('ready', function () {

    console.log('rum ready!');
    client.customEvent('MY_EVENT', {});
});

client.connect('rum-wss-test-nx.ifunplus.cn:13555');

client.uid = 'xxxx-xxx-xxxxxxxxxxxxx';
client.customEvent('MY_EVENT', {});
```

#### HOOK ####
* 支持`http hook`, 自动抓取http状态, 不会抓取请求内容
* 支持`share hook`, 自动抓取平台分享动作,并上报相关内容
* 开启HOOK会重载`wx`接口, 请了解并关注`Wechat`开放平台相关协议
* 禁用HOOK并停止平台数据抓取:`platformRum: new rum.WechatRum(false)`
