require('dotenv/config');

process.env.USE_MONGO_DATA = 1;
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const config = require('./config'),
  mongoose = require('mongoose'),
  Promise = require('bluebird'),
  expect = require('chai').expect,
  _ = require('lodash'),
  require_all = require('require-all');


mongoose.Promise = Promise;
mongoose.accounts = mongoose.createConnection(config.mongo.accounts.uri);
mongoose.data = mongoose.createConnection(config.mongo.data.uri);

const requests = require('./services/requests'),
  accountModel = require('../models/accountModel'),
  blockModel = require('../models/blockModel'),
  clearMongoAccounts = require('./helpers/clearMongoAccounts'),
  clearQueues = require('./helpers/clearQueues'),
  connectToQueue = require('./helpers/connectToQueue'),
  consumeMessages = require('./helpers/consumeMessages'),
  saveAccountForAddress = require('./helpers/saveAccountForAddress'),
  getAccountFromMongo = require('./helpers/getAccountFromMongo'),
  request = require('request'),
  net = require('net'),
  moment = require('moment'),
  amqp = require('amqplib');

  let accounts, amqpInstance;

describe('core/rest', function () { //todo add integration tests for query, push tx, history and erc20tokens

  before(async () => {
    await accountModel.remove();
    amqpInstance = await amqp.connect(config.rabbit.url);

    accounts = config.dev.accounts;
    await saveAccountForAddress(accounts[0]);
    await clearQueues(amqpInstance);
  });

  after(async () => {
    return mongoose.disconnect();
  });

  afterEach(async () => {
      await clearQueues(amqpInstance);
  });

  it('address/create from post request', async () => {
    const newAddress = `0x${_.chain(new Array(40)).map(() => _.random(0, 9)).join('').value()}`;
    accounts.push(newAddress);

    await new Promise((res, rej) => {
      request({
        url: `http://localhost:${config.rest.port}/addr/`,
        method: 'POST',
        json: {address: newAddress}
      }, async(err, resp) => {
          if (err || resp.statusCode !== 200) {
            return rej(err || resp)
          }
          const account = await getAccountFromMongo(newAddress);
          expect(account).not.to.be.null;
          expect(account.isActive).to.be.true;
          expect(account.balance.toNumber()).to.be.equal(0);
          res();
      });
    });
  });

  it('address/create from rabbit mq', async () => {
    const newAddress = `0x${_.chain(new Array(40)).map(() => _.random(0, 9)).join('').value()}`;
    accounts.push(newAddress);    

    // await Promise.all([
    //   (async () => {
        const channel = await amqpInstance.createChannel();
        const info = {address: newAddress};
        await channel.publish('events', `${config.rabbit.serviceName}.account.create`, new Buffer(JSON.stringify(info)));
    
        await Promise.delay(3000);
    
        const account = await getAccountFromMongo(newAddress);
        expect(account).not.to.be.null;
        expect(account.isActive).to.be.true;
        expect(account.balance.toNumber()).to.be.equal(0);
      // })(),
      // (async () => {
      //   const channel = await amqpInstance.createChannel();
      //   await connectToQueue(channel, `${config.rabbit.serviceName}.account.created`);
      //   await consumeMessages(1, channel,`${config.rabbit.serviceName}.account.created`,  (message) => {
      //       const content = JSON.parse(message.content);
      //       expect(content.address).to.be.equal(newAddress);
      //   })
      // })()
    // ]);
  });

  it('address/update balance address by amqp', async() => {
    const channel = await amqpInstance.createChannel();
    const info = {address: accounts[0]};
    await channel.publish('events', `${config.rabbit.serviceName}.account.balance`, new Buffer(JSON.stringify(info)));

    await Promise.delay(3000);

    const account = await getAccountFromMongo(accounts[0]);
    expect(account).not.to.be.null;
    expect(account.balance.toNumber()).to.be.greaterThan(0);
  });

  it('address/remove by rest', async () => {
    const removeAddress = _.pullAt(accounts, accounts.length-1)[0];

    await new Promise((res, rej) => {
      request({
        url: `http://localhost:${config.rest.port}/addr/`,
        method: 'DELETE',
        json: {address: removeAddress}
      }, async(err, resp) => {
          if (err || resp.statusCode !== 200) {
            return rej(err || resp)
          }
          const account = await getAccountFromMongo(removeAddress);
          expect(account).not.to.be.null;
          expect(account.isActive).to.be.false;
          res();
      });
    });
  });

  it('address/remove from rabbit mq', async () => {
    const removeAddress = _.pullAt(accounts, accounts.length-1)[0];    

    // await Promise.all([
    //   (async () => {
        const channel = await amqpInstance.createChannel();
        const info = {address: removeAddress};
        await channel.publish('events', `${config.rabbit.serviceName}.account.delete`, new Buffer(JSON.stringify(info)));
    
        await Promise.delay(3000);
    
        const account = await getAccountFromMongo(removeAddress);
        expect(account).not.to.be.null;
        expect(account.isActive).to.be.false;
    //   })(),
    //   (async () => {
    //     const channel = await amqpInstance.createChannel();
    //     await connectToQueue(channel, `${config.rabbit.serviceName}.account.deleted`);
    //     return await consumeMessages(1, channel, `${config.rabbit.serviceName}.account.deleted`, (message) => {
    //       const content = JSON.parse(message.content);
    //       expect(content.address).to.be.equal(removeAddress);
    //     })
    //   })()
    // ]);
 });

  const tokenForAsset = `0x${_.chain(new Array(40)).map(() => _.random(0, 9)).join('').value()}`;
  

  it('address/add asset by rest for right', async () => {
    const address = accounts[0];

    await new Promise((res, rej) => {
      request({
        url: `http://localhost:${config.rest.port}/addr/${address}/asset`,
        method: 'POST',
        json: {assets: [tokenForAsset]}
      }, async(err, resp) => {
          if (err || resp.statusCode !== 200) {
            return rej(err || resp)
          }
          const account = await getAccountFromMongo(address);
          expect(account.assets[tokenForAsset]).to.be.equal(0);
          res();
      });
    });
  });



  it('address/add asset by rest for error', async () => {
    const address = accounts[1];
    const token = `0x${_.chain(new Array(40)).map(() => _.random(0, 9)).join('').value()}`;

    await new Promise((res, rej) => {
      request({
        url: `http://localhost:${config.rest.port}/addr/${address}/asset`,
        method: 'POST',
        json: {assets: token}
      }, async(err, resp) => {
          if (err || resp.statusCode !== 200) {
            return rej(err || resp)
          }
          expect(resp.body.code).to.be.equal(0);
          expect(resp.body.message).to.be.equal('fail');
          res();
      });
    });
  });

  it('address/remove asset by rest for right', async () => {
    const address = accounts[0];

    await new Promise((res, rej) => {
      request({
        url: `http://localhost:${config.rest.port}/addr/${address}/asset`,
        method: 'DELETE',
        json: {assets: [tokenForAsset]}
      }, async(err, resp) => {
          if (err || resp.statusCode !== 200) {
            return rej(err || resp)
          }
          const account = await getAccountFromMongo(address);
          expect(account.assets[tokenForAsset]).to.be.undefined;
          res();
      });
    });
  });

  it('address/remove asset by rest for error', async () => {
    const address = accounts[1];
    const token = `0x${_.chain(new Array(40)).map(() => _.random(0, 9)).join('').value()}`;

    await new Promise((res, rej) => {
      request({
        url: `http://localhost:${config.rest.port}/addr/${address}/asset`,
        method: 'DELETE',
        json: {assets: token}
      }, async(err, resp) => {
          if (err || resp.statusCode !== 200) {
            return rej(err || resp)
          }
          expect(resp.body.code).to.be.equal(0);
          expect(resp.body.message).to.be.equal('fail');
          res();
      });
    });
  });

  it('address/balance by rest', async () => {
    const address = accounts[0];

    await new Promise((res, rej) => {
      request({
        url: `http://localhost:${config.rest.port}/addr/${address}/balance`,
        method: 'GET',
      }, async(err, resp) => {
          if (err || resp.statusCode !== 200) {
            return rej(err || resp)
          }

          const body = JSON.parse(resp.body);
          expect(body.balance).to.be.not.undefined;
          expect(body.assets).to.be.empty;
          res();
      });
    });
  });

  let exampleTransactionHash;

  it('GET tx/:addr/history for some query params and one right transaction [0 => 1]', async () => {
    const address = accounts[0];

    exampleTransactionHash = await requests.signTransaction(
      config.dev.apiKey, accounts[1], 100, accounts[0]);
    await requests.sendTransaction(config.dev.apiKey, transferTx);

    await new blockModel({
      verions: -1,
      number: 1,
      'hash': 1,
      prevBlockHash: 1,
      'timestamp': 0,
      'transactions': [
        exampleTransactionHash
      ]
    }).save();

    const query = `limit=1`;

    await new Promise((res, rej) => {
      request({
        url: `http://localhost:${config.rest.port}/tx/${address}/history?${query}`,
        method: 'GET',
      }, async(err, resp) => {
          if (err || resp.statusCode !== 200) {
            return rej(err || resp)
          }

          try {
            expect(resp.body).to.not.be.empty;
            const body = JSON.parse(resp.body);
            expect(body).to.be.an('array').not.empty;

            const respTx = body[0];
            expect(respTx.to).to.equal(accounts[1]);
            expect(respTx.from).to.equal(accounts[0]);
            expect(respTx).to.contain.all.keys(['hash', 'blockNumber', 'blockHash', 'timestamp']);
            res();            
          } catch (e) {
            rej(e || resp);
          }
      });
    });
  });


  it('GET tx/:addr/history for non exist', async () => {
    const address = 'LAAAAAAAAAAAAAAAALLL';



    await new Promise((res, rej) => {
      request({
        url: `http://localhost:${config.rest.port}/tx/${address}/history`,
        method: 'GET',
      }, async(err, resp) => {
          if (err || resp.statusCode !== 200) {
            return rej(err || resp)
          }

          const body = resp.body;
          expect(body).to.be.equal('');
          res();
      });
    });
  });

  it('GET tx/:hash for transaction [0 => 1]', async () => {
    const address = accounts[1];


    const query = `to=${accounts[1]}&created<${moment().toISOString()}`;

    await new Promise((res, rej) => {
      request({
        url: `http://localhost:${config.rest.port}/tx/${exampleTransactionHash}`,
        method: 'GET',
      }, (err, resp) => {
          if (err || resp.statusCode !== 200) {
            return rej(err || resp)
          }

          const respTx = JSON.parse(resp.body);
          //expect(respTx.to).to.equal(accounts[1]);
          //expect(respTx.from).to.equal(accounts[0]);
          expect(respTx).to.contain.all.keys(['to', 'from', 'hash', 'blockNumber', 'blockHash']);
          res();
      });
    });
  });


});
