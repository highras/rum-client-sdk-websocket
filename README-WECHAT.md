# fpnn rum sdk websocket #

* 不支持`FPNN`加密链接, 支持`SSL`加密链接
* 源码方式接入

#### 关于三方包依赖 ####
* [base64](https://github.com/dankogai/js-base64) `./libs/base64-js.js`
* [ieee754](https://github.com/feross/ieee754) `./libs/ieee754.js`
* [buffer](https://github.com/feross/buffer) `./libs/buffer.js`
* [md5](https://github.com/emn178/js-md5) `./libs/md5.min.js`

#### Promise支持 ####
* 支持动态转Promise接口
* 参考:[Promise.promisifyAll](http://bluebirdjs.com/docs/api/promise.promisifyall.html)

#### 一个例子 ####
* 添加依赖包到`libs`文件夹中
* 创建`livedata`文件夹并导入SDK源代码
* 目录结构(推荐) 
```
- js/
    + base/
    - libs/
        - base64-js.js
        - buffer.js
        - ieee754.js
        - md5.min.js
        ...
    - livedata/
        + fpnn/
        + rum/
    + npc/
    + player/
    + runtime/
    - main.js
    ...
- game.js
- game.json
...
```

* 参考 `./test/test-wechat.js`
```javascript
import WechatRum from './js/livedata/rum/platform/WechatRum'
import WechatImpl from './js/livedata/fpnn/platform/WechatImpl'
import RUMClient from './js/livedata/rum/RUMClient'

let client = new RUMClient({
    pid: 41000005,
    token: 'dd38c76b-91c2-4be1-8607-7b9e860947b1',
    appv: '10.0'
    ssl: true,
    debug: true,
    platformImpl: new WechatImpl(),
    platformRum: new WechatRum(false)
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

* `uid`: **(SET | string)** 设置用户ID

* `customEvent(ev, attrs, strict)`: 上报自定义事件 
    * `ev`: **(Required | string)** 自定义事件名称
    * `attrs`: **(Optional | object)** 自定义事件内容
    * `strict`: **(Optional | bool)** 是否为严格模式, 严格模式下首先将该事件写入本地缓存, 或引起性能下降, 默认: `false`

#### HOOK ####
* 开启平台接口数据抓取, `platformRum: new WechatRum(true)`
* 目前只支持`http hook`, 开启后自动抓取http状态, 不会抓取请求内容
* 开启HOOK会封装并重载`wx`接口, 请了解并关注`Wechat`开放平台相关协议
