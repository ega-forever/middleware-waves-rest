/** 
* Copyright 2017–2018, LaborX PTY
* Licensed under the AGPL Version 3 license.
* @author Kirill Sergeev <cloudkserg11@gmail.com>
*/
const request = require('request-promise'),
  _ = require('lodash'),
  {URL} = require('url'),
  bunyan = require('bunyan'),
  Promise = require('bluebird'),
  log = bunyan.createLogger({name: 'wavesBlockprocessor.nodeSenderService'});

let configRpc = require('../config').node;


const getFrom = query => makeRequest(query, 'GET');
const setRpcConfig = (newConfig) => {
  configRpc = newConfig;
};

const privatePost = (query, body, apiKey) => makeRequest(query, 'POST', body, {
  'X-API-Key': apiKey
});

const makeRequest = function (path, method, body, headers = {})  {
  const options = {
    method,
    body,
    uri: new URL(path, configRpc.rpc),
    json: true,
    headers
  };
  return request(options).catch(async (e) => await errorHandler(e));
};


const errorHandler = async (err) => {
  if (err.name && err.name === 'StatusCodeError')
    await Promise.delay(10000);
  log.error(err);
};


const getBalanceByAddress = async (address) => {
  const result = await getFrom(`/addresses/balance/${address}`);
  return _.get(result, 'balance', null);
};

const getBalanceByAddressAndAsset = async (address, assetId) => {
  const result = await getFrom(`/assets/balance/${address}/${assetId}`);
  return _.get(result, 'balance', null);
};

const createBlock = (block) => {
  if (block.signature === undefined) 
    return block;
  return _.merge(block, {
    hash: block.signature
  });
};

/**
 * @return {Promise return Number}
 */
const getLastBlockNumber = async () => {
  const result = await getFrom('/blocks/height');
  return ((result.height && result.height > 0) ? result.height : 0);
};


/**
 * 
 * @param {Number} height 
 * @return {Promise return Object}
 */
const getBlockByNumber = async (height) => {
  const block = await getFrom(`/blocks/at/${height}`);
  return createBlock(block); 
};

/**
 * 
 * @param {Array of Number} numbers 
 * @return {Promise return Object[]}
 */
const getBlocksByNumbers = async (numbers) => {
  const blocks = await Promise.map(numbers,
    async blockNumber => await getBlockByNumber(blockNumber).catch(() => {}) 
  );
  return _.chain(blocks).filter(block => block && block.signature !== undefined)
    .value();
};

/**
 * @param {String} hash
 * @return {Promise return Object}
 */
const getBlockByHash = async (hash) => {
  
  const block = await getFrom(`/blocks/signature/${hash}`);
  return createBlock(block);
};


/**
 * @param {Object} tx 
 * @param {String} rpcAddress
 * @return {Promise}
 */
const sendTransactionFromLib = (tx, rpcAddress) => {
  return request({
    method: 'POST',
    body: tx,
    uri: new URL('/assets/broadcast/transfer', rpcAddress),
    json: true
  });
};




module.exports = {  
  getBalanceByAddress,
  getBalanceByAddressAndAsset,

  sendTransactionFromLib,

  setRpcConfig,
  getLastBlockNumber,
  getBlockByNumber,
  getBlockByHash,
  getBlocksByNumbers
};
