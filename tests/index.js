/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */
require('dotenv/config');

process.env.USE_MONGO_DATA = 1;
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const config = require('./config'),
  mongoose = require('mongoose'),
  Promise = require('bluebird'),
  expect = require('chai').expect,
  _ = require('lodash');


mongoose.Promise = Promise;
mongoose.accounts = mongoose.createConnection(config.mongo.accounts.uri);
mongoose.data = mongoose.createConnection(config.mongo.data.uri);

const accountModel = require('../models/accountModel'),
  txModel = require('../models/txModel'),
  clearQueues = require('./helpers/clearQueues'),
  WavesAPI = require('@waves/waves-api'),
  saveAccountForAddress = require('./helpers/saveAccountForAddress'),
  getAccountFromMongo = require('./helpers/getAccountFromMongo'),
  request = require('request'),
  amqp = require('amqplib'),
  ctx = {
    accounts: [],
    amqp: {},
    tx: null
  };

//let accounts, amqpInstance, exampleTransactionHash;

describe('core/rest', function () {

  before(async () => {
    await txModel.remove();
    await accountModel.remove();

    ctx.amqp.instance = await amqp.connect(config.nodered.functionGlobalContext.settings.rabbit.url);

    ctx.accounts = config.dev.accounts;
    await saveAccountForAddress(ctx.accounts[0]);
    await clearQueues(ctx.amqp.instance);
  });

  after(async () => {
    return mongoose.disconnect();
  });

  afterEach(async () => {
    await clearQueues(ctx.amqp.instance);
  });

  it('address/create from post request and check send event user.created in internal', async () => {
    const newAddress = `${_.chain(new Array(35)).map(() => _.random(0, 9)).join('').value()}`;
    ctx.accounts.push(newAddress);

    await new Promise.all([
      (async () => {
        await new Promise((res, rej) => {
          request({
            url: `http://localhost:${config.rest.port}/addr/`,
            method: 'POST',
            json: {address: newAddress}
          }, async (err, resp) => {
            if (err || resp.statusCode !== 200)
              return rej(err || resp);
            const account = await getAccountFromMongo(newAddress);
            expect(account).not.to.be.null;
            expect(account.isActive).to.be.true;
            res();
          });
        });
      })(),
      (async () => {
        const channel = await ctx.amqp.instance.createChannel();
        await channel.assertExchange('internal', 'topic', {durable: false});
        await channel.assertQueue(`${config.nodered.functionGlobalContext.settings.rabbit.serviceName}_test.user`);
        await channel.bindQueue(`${config.nodered.functionGlobalContext.settings.rabbit.serviceName}_test.user`, 'internal', `${config.nodered.functionGlobalContext.settings.rabbit.serviceName}_user.created`);
        channel.consume(`${config.nodered.functionGlobalContext.settings.rabbit.serviceName}_test.user`, async (message) => {
          const content = JSON.parse(message.content);
          expect(content.address).to.be.equal(newAddress);
        }, {noAck: true});
      })()
    ]);

  });

  it('tx/send send signedTransaction', async () => {
    const Waves = WavesAPI.create({
      networkByte: 'CUSTOM',
      nodeAddress: config.node.rpc,
      matcherAddress: config.dev.matcherAddress,
      minimumSeedLength: 1
    });
    const seed = Waves.Seed.fromExistingPhrase(config.dev.seedPhraseOne);
    const transferData = {
      senderPublicKey: seed.keyPair.publicKey,
      // An arbitrary address; mine, in this example
      recipient: '3Jk2fh8aMBmhCQCkBcUfKBSEEa3pDMkDjCr',
      // ID of a token, or WAVES
      assetId: 'WAVES',
      // The real amount is the given number divided by 10^(precision of the token)
      amount: 10000000,
      // The same rules for these two fields
      feeAssetId: 'WAVES',
      fee: 100000,
      // 140 bytes of data (it's allowed to use Uint8Array here)
      attachment: '',
      timestamp: Date.now()
    };
    const Transactions = Waves.Transactions;
    const transferTransaction = new Transactions.TransferTransaction(transferData);
    const tx = await transferTransaction.prepareForAPI(seed.keyPair.privateKey);

    await new Promise((res, rej) => {
      request({
        url: `http://localhost:${config.rest.port}/tx/send`,
        method: 'POST',
        json: tx
      }, async (err, resp) => {
        if (err || resp.statusCode !== 200)
          return rej(err || resp);

        const body = resp.body;
        expect(body.senderPublicKey).to.eq(seed.keyPair.publicKey);
        expect(body.fee).to.eq(100000);
        expect(body.id).to.not.empty;
        res();
      });
    });
  });

  it('address/remove by rest', async () => {
    const removeAddress = _.pullAt(ctx.accounts, ctx.accounts.length - 1)[0];

    await new Promise((res, rej) => {
      request({
        url: `http://localhost:${config.rest.port}/addr/`,
        method: 'DELETE',
        json: {address: removeAddress}
      }, async (err, resp) => {
        if (err || resp.statusCode !== 200)
          return rej(err || resp);

        const account = await getAccountFromMongo(removeAddress);
        expect(account).not.to.be.null;
        expect(account.isActive).to.be.false;
        res();
      });
    });
  });

  it('address/balance by rest', async () => {
    const address = ctx.accounts[0];

    await new Promise((res, rej) => {
      request({
        url: `http://localhost:${config.rest.port}/addr/${address}/balance`,
        method: 'GET',
      }, async (err, resp) => {
        if (err || resp.statusCode !== 200)
          return rej(err || resp);

        const body = JSON.parse(resp.body);
        expect(body.balance).to.be.not.undefined;
        expect(body.assets).to.be.empty;
        res();
      });
    });
  });

  it('GET tx/:addr/history for some query params and one right transaction [0 => 1]', async () => {
    const txs = [{
      recipient: ctx.accounts[1],
      type: '257',
      sender: ctx.accounts[0],
      _id: `${_.chain(new Array(40)).map(() => _.random(0, 9)).join('').value()}`,
      amount: 200,
      timestamp: Date.now(),
      blockNumber: 1425994
    }, {
      recipient: 'TDFSDFSFSDFSDFSDFSDFSDFSDFSDFSDFS',
      type: '257',
      timestamp: Date.now(),
      sender: 'FDGDGDFGDFGDFGDFGDFGDFGDFGDFGD',
      _id: `${_.chain(new Array(40)).map(() => _.random(0, 9)).join('').value()}`,
      amount: 100,
      blockNumber: 1425994
    }];

    ctx.tx = txs[0];
    await txModel.create(txs[0]);
    await txModel.create(txs[1]);

    const query = 'limit=1';

    await new Promise((res, rej) => {
      request({
        url: `http://localhost:${config.rest.port}/tx/${ctx.accounts[0]}/history?${query}`,
        method: 'GET',
      }, async (err, resp) => {
        if (err || resp.statusCode !== 200)
          return rej(err || resp);

        try {
          expect(resp.body).to.not.be.empty;
          const body = JSON.parse(resp.body);
          expect(body).to.be.an('array').not.empty;

          const respTx = body[0];
          expect(respTx.recipient).to.equal(ctx.accounts[1]);
          expect(respTx.sender).to.equal(ctx.accounts[0]);
          expect(respTx.id).to.equal(ctx.tx._id);
          expect(respTx).to.contain.all.keys(['blockNumber', 'timestamp', 'amount']
          );
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
      }, async (err, resp) => {
        if (err || resp.statusCode !== 200)
          return rej(err || resp);

        const body = JSON.parse(resp.body);
        expect(body).to.be.empty;
        res();
      });
    });
  });

  it('GET tx/:hash for transaction [0 => 1]', async () => {
    await new Promise((res, rej) => {
      request({
        url: `http://localhost:${config.rest.port}/tx/${ctx.tx._id}`,
        method: 'GET',
      }, (err, resp) => {
        if (err || resp.statusCode !== 200)
          return rej(err || resp);

        const respTx = JSON.parse(resp.body);
        expect(respTx.recipient).to.equal(ctx.accounts[1]);
        expect(respTx.sender).to.equal(ctx.accounts[0]);
        expect(respTx).to.contain.all.keys(['sender', 'recipient', 'blockNumber', 'amount', 'timestamp']);
        res();
      });
    });
  });
});
