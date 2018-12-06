'use strict'

const RUMClient = require('./rum/RUMClient');
const RUMConfig = require('./rum/RUMConfig');
const RUMEvent = require('./rum/RUMEvent');
const RUMProxy = require('./rum/RUMProxy');

const BrowserRum = require('./rum/platform/BrowserRum');
const WechatRum = require('./rum/platform/WechatRum');

module.exports = {
	RUMClient,
	RUMConfig,
	RUMEvent,
	RUMProxy,
	BrowserRum,
	WechatRum
};