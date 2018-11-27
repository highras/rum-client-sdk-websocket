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