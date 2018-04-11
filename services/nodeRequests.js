const request = require('request-promise'),
  config = require('../config'),
  _ = require('lodash'),
  {URL} = require('url'),
  bunyan = require('bunyan'),
  Promise = require('bluebird'),
  log = bunyan.createLogger({name: 'wavesBlockprocessor.nodeSenderService'});




const get = query => makeRequest(query, 'GET');


const makeRequest = (path, method, body, headers = {}) => {
  const options = {
    method,
    body,
    uri: new URL(path, config.node.rpc),
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
  const result = await get(`/addresses/balance/${address}`);
  return _.get(result, 'balance', null);
};

const getBalanceByAddressAndAsset = async (address, assetId) => {
  const result = await get(`/assets/balance/${address}/${assetId}`);
  return _.get(result, 'balance', null);
};

const createBlock = (block) => {
  return _.merge(block, {
    hash: block.signature
  });
};



/**
 * @return {Promise return Number}
 */
const getLastBlockNumber = async () => {
  const result = await get('/blocks/height');
  return ((result.height && result.height > 0) ? result.height : 0);
};

/**
 * 
 * @param {Number} height 
 * @return {Promise return Object}
 */
const getBlockByNumber = async (height) => {
  const block = await get(`/blocks/at/${height}`);
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


module.exports = {
  getBalanceByAddress,
  getBalanceByAddressAndAsset,

  getLastBlockNumber,
  getBlockByNumber,
  getBlocksByNumbers
};
