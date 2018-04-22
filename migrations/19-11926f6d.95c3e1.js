
module.exports.id = '19.11926f6d.95c3e1';

const _ = require('lodash'),
  config = require('../config');

/**
 * @description flow 11926f6d.95c3e1 update
 * @param done
 */
   

module.exports.up = function (done) {
  let coll = this.db.collection(`${_.get(config, 'nodered.mongo.collectionPrefix', '')}noderedstorages`);
  coll.update({"path":"11926f6d.95c3e1","type":"flows"}, {
    $set: {"path":"11926f6d.95c3e1","body":[{"id":"f71e4f8.f819fb","type":"http in","z":"11926f6d.95c3e1","name":"events","url":"/events","method":"get","upload":false,"swaggerDoc":"","x":120,"y":217.5,"wires":[["12e2a4a.b20b25b"]]},{"id":"12e2a4a.b20b25b","type":"function","z":"11926f6d.95c3e1","name":"transform params","func":"\nconst factories = global.get('factories');\nconst _ = global.get('_');\n\n\nmsg.payload = _.chain(factories.sm)\n    .values()\n    .map(value => \n      _.chain(value).get('abi')\n        .filter({type: 'event'})\n        .value()\n    )\n    .flattenDeep()\n    .map(ev=>ev.name)\n    .uniq()\n    .value();\n\nreturn msg;","outputs":1,"noerr":0,"x":322.500003814697,"y":217.499998092651,"wires":[["c49a5649.c046a8"]]},{"id":"c49a5649.c046a8","type":"http response","z":"11926f6d.95c3e1","name":"","statusCode":"","headers":{},"x":547.500015258789,"y":216.25000333786,"wires":[]},{"id":"5a97720b.d0cc1c","type":"http in","z":"11926f6d.95c3e1","name":"get event","url":"/events/:event","method":"get","upload":false,"swaggerDoc":"","x":135,"y":401.25,"wires":[["b1cd37e5.74a048"]]},{"id":"26896dec.5a53d2","type":"function","z":"11926f6d.95c3e1","name":"transform params","func":"\nmsg.payload = {\n    model: msg.req.params.event,\n    request: msg.payload.criteria,\n    options: msg.payload.options\n};\n\n\n\nreturn msg;","outputs":1,"noerr":0,"x":536.5000305175781,"y":393.2500247955322,"wires":[["5b0b9e21.6451c","e9709d6.a4ad16"]]},{"id":"2858f1ab.675c5e","type":"http response","z":"11926f6d.95c3e1","name":"","statusCode":"","x":956.5,"y":400,"wires":[]},{"id":"b1cd37e5.74a048","type":"query-to-mongo","z":"11926f6d.95c3e1","request_type":"0","name":"query-to-mongo","x":312.0000305175781,"y":396.0000238418579,"wires":[["26896dec.5a53d2"]]},{"id":"5b0b9e21.6451c","type":"mongo","z":"11926f6d.95c3e1","model":"","request":"","options":"","name":"mongo","mode":"1","requestType":"0","dbAlias":"primary.data","x":775.0001258850098,"y":421.0000705718994,"wires":[["2858f1ab.675c5e","e9709d6.a4ad16"]]},{"id":"98d44384.a7dde","type":"catch","z":"11926f6d.95c3e1","name":"","scope":null,"x":320,"y":591,"wires":[["555b9a3a.231ad4","bd6bd81f.7b0788"]]},{"id":"5410ef0.54afe1","type":"http response","z":"11926f6d.95c3e1","name":"","statusCode":"","x":777,"y":592,"wires":[]},{"id":"555b9a3a.231ad4","type":"function","z":"11926f6d.95c3e1","name":"transform","func":"\nlet factories = global.get(\"factories\"); \n\nmsg.payload = factories.messages.generic.fail;\n    \nreturn msg;","outputs":1,"noerr":0,"x":561,"y":591,"wires":[["5410ef0.54afe1"]]},{"id":"bd6bd81f.7b0788","type":"debug","z":"11926f6d.95c3e1","name":"","active":true,"console":"false","complete":"false","x":501.5,"y":515.3333740234375,"wires":[]},{"id":"e9709d6.a4ad16","type":"debug","z":"11926f6d.95c3e1","name":"","active":true,"console":"false","complete":"false","x":736.5,"y":302.66668701171875,"wires":[]}]}
  }, {upsert: true}, done);
};

module.exports.down = function (done) {
  let coll = this.db.collection(`${_.get(config, 'nodered.mongo.collectionPrefix', '')}noderedstorages`);
  coll.remove({"path":"11926f6d.95c3e1","type":"flows"}, done);
};
