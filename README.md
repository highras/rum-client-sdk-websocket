# fpnn rum sdk websocket #

* 不支持`FPNN`加密链接, 支持`SSL`加密链接
* 支持源码方式接入, 支持自定义构建

#### 关于三方包依赖 ####
* [buffer](https://github.com/feross/buffer) `./libs/buffer.js`
* [md5](https://github.com/emn178/js-md5) `./libs/md5.min.js`
* [ua-parser](https://github.com/faisalman/ua-parser-js) `./libs/ua-parser.min.js`

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
* 参考 `./test/index.html` `./test/test-rum.js` 打开浏览器console输出
```html
<script src="../dist/rum.min.js"></script>
```

```javascript
let client = new RUMClient({
    pid: 41000005,
    token: 'dd38c76b-91c2-4be1-8607-7b9e860947b1',
    appv: '10.0',
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
    client.customEvent('MY_EVENT', {});
});

client.connect('rum-wss-test-nx.ifunplus.cn:13555');

client.uid = 'xxxx-xxx-xxxxxxxxxxxxx';
client.customEvent('MY_EVENT', {});
```

#### Events ####
* `event`:
    * `ready`: 初始化完成 

    * `error`: 异常
        * `err`: **(Error)**

    * `close`: 连接关闭

#### API ####
* `constructor(options)`: 构造RUMClient
    * `options.pid`: **(Required | number)** 应用ID, RUM项目控制台获取
    * `options.token`: **(Required | string)** 应用Token, RUM项目控制台获取
    * `options.debug`: **(Optional | bool)** 是否开启调试日志, 默认: `false`
    * `options.ssl`: **(Optional | bool)** 是否开启SSL加密, 默认: `true`
    * `options.uid`: **(Optional | string)** 应用开放用户ID 
    * `options.appv`: **(Optional | string)** 应用版本号
    * `options.platformImpl`: **(Optional | object)** 平台接口实现, 默认: `BrowserImpl`
    * `options.platformRum`: **(Optional | object)** 平台RUM实现, 默认: `BrowserRum`

* `destroy()`: 断开链接并销毁 

* `connect(endpoint, clearStorage)`: 连接服务器
    * `endpoint`: **(Required | string)** RUMAgent接入地址, 由RUM项目控制台获取
    * `clearStorage`: **(Optional | bool)** 是否格式化本地事件缓存, 默认: `false`

* `session`: **(GET | number)** 会话 ID, 设备唯一, 可用于服务端事件关联

* `rumId`: **(GET | string)** RUM ID, 唯一, 可用于服务端事件关联

* `uid`: **(SET | string)** 设置用户ID

* `customEvent(ev, attrs, strict)`: 上报自定义事件 
    * `ev`: **(Required | string)** 自定义事件名称
    * `attrs`: **(Optional | object)** 自定义事件内容
    * `strict`: **(Optional | bool)** 是否为严格模式, 严格模式下首先将该事件写入本地缓存, 或引起性能下降, 默认: `false`

#### Wechat ####
[Wechat Version](README-WECHAT.md)
