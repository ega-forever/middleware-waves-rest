/**
 * Mongoose model. Accounts
 * @module models/accountModel
 * @returns {Object} Mongoose model
 * @requires factories/addressMessageFactory
 * 
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
*/

const mongoose = require('mongoose'),
  _ = require('lodash'),
  jsesc = require('jsesc'),
  config = require('../config');

require('mongoose-long')(mongoose);


const setAssets = (assets) => {
  return _.chain(assets).toPairs()
    .map(pair => {
      pair[0] = jsesc(pair[0].replace(new RegExp(/\./g), '::'));
      if(pair[0][0] === '$')
        pair[0] = '/$/' + pair[0].slice(1);
      return pair;
    })
    .fromPairs()
    .value();
};

const getAssets = (mosaics) => {
  return _.chain(mosaics).toPairs()
    .map(pair => {
      pair[0] = pair[0].replace(new RegExp(/::/g), '.');
      if(pair[0].indexOf('/$/') === 0)
        pair[0] = '$' + pair[0].slice(3);
      return pair;
    })
    .fromPairs()
    .value();
};

const Account = new mongoose.Schema({
  address: {
    type: String,
    unique: true,
    required: true,
    validate: [a=>  /^[0-9a-zA-Z]{35}$/.test(a)]
  },
  assets: {type: mongoose.Schema.Types.Mixed, default: {}, set: setAssets, get: getAssets},
  balance: {type: mongoose.Schema.Types.Long, default: 0},
  isActive: {type: Boolean, required: true, default: true},
  created: {type: Date, required: true, default: Date.now},
});

module.exports = mongoose.accounts.model(`${config.mongo.accounts.collectionPrefix}Account`, Account);
