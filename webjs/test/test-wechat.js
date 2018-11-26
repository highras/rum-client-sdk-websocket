/** README

    微信平台不支持二进制数据结构, 所以需要加入以下三个类库
    ./js/libs/base64-js.js
    ./js/libs/ieee754.js
    ./js/libs/buffer.js

    一个md5类库
    ./js/libs/md5.min.js


    //自定义事件
    client.customEvent('EVENT_NAME', {});

    //设置平台开放用户ID
    client.uid = 'xxxxx-xxxx-xxxxxxxxxxxx';

    //开启http性能上报, 需要封装并重载wx.request接口
    platformRum: new WechatRum(true)
*/

import WechatRum from './js/rum/rum/platform/WechatRum'
import WechatImpl from './js/rum/fpnn/platform/WechatImpl'
import RUMClient from './js/rum/rum/RUMClient'

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
});

client.connect('rum-wss-test-nx.ifunplus.cn:13555');