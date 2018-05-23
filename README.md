# middleware-waves-rest [![Build Status](https://travis-ci.org/ChronoBank/middleware-waves-rest.svg?branch=master)](https://travis-ci.org/ChronoBank/middleware-waves-rest)

Middleware service for which expose rest api

### Installation

This module is a part of middleware services. You can install it in 2 ways:

1) through core middleware installer  [middleware installer](https://www.npmjs.com/package/chronobank-middleware)
2) by hands: just clone the repo, do 'npm install', set your .env - and you are ready to go

#### About
This module is used for interaction with middleware. This happens through the layer, which is built on node-red.
So, you don't need to write any code - you can create your own flow with UI tool supplied by node-red itself. Access by this route:
```
/admin
````


#### Predefined Routes with node-red flows


The available routes are listed below:

| route | mwavesods | params | description |
| ------ | ------ | ------ | ------ |
| /addr   | POST | ``` {address: <string>, assets: [<string>], nem: [<string>]} ``` | register new address on middleware. assets - is an array of assets, which balance changes this address will listen to (optional), nem - is nem's address (optional).
| /addr   | DELETE | ``` {address: <string>} ``` | mark an address as inactive and stop perform any actions for this address.
| /addr/{address}/token   | POST | ``` {assets: [<string>]} ``` | push passed assets to an exsiting one for the registered user.
| /addr/{address}/token   | POST | ``` {assets: [<string>]} ``` | pull passed assets from an exsiting one for the registered user.
| /addr/{address}/balance   | GET |  | retrieve balance of the registered address
| /tx/{address}/history/{startBlock}/{endBlock}   | GET |  | retrieve transactions for the regsitered address in a block range. endBlock - is optional (if not specified - the range will be = 100).
| /tx   | POST | ``` {tx: <string>} ``` | broadcast raw transaction
| /tx/{hash}   | GET | | return tx by its hash


#### REST guery language

Every collection could be fetched with an additional query. The api use [query-to-mongo](https://www.npmjs.com/package/query-to-mongo) plugin as a backbone layer between GET request queries and mongo's. For instance, if we want to fetch all recods from collection 'issue', where issueNumber < 20, then we will make a call like that:
```
curl http://localhost:8080/events/issue?issueNumber<20
```


##### сonfigure your .env

To apply your configuration, create a .env file in root folder of repo (in case it's not present already).
Below is the expamle configuration:

```
MONGO_ACCOUNTS_URI=mongodb://localhost:27017/data
MONGO_ACCOUNTS_COLLECTION_PREFIX=waves

MONGO_DATA_URI=mongodb://localhost:27017/data
MONGO_DATA_COLLECTION_PREFIX=waves

NODERED_MONGO_URI=mongodb://localhost:27018/data
NODE_RED_MONGO_COLLECTION_PREFIX=rest

REST_PORT=8081
NETWORK=development
NODERED_AUTO_SYNC_MIGRATIONS=true
NIS=http://localhost:6869
```

The options are presented below:

| name | description|
| ------ | ------ |
| MONGO_URI   | the URI string for mongo connection
| MONGO_COLLECTION_PREFIX   | the default prefix for all mongo collections. The default value is 'waves'
| MONGO_ACCOUNTS_URI   | the URI string for mongo connection, which holds users accounts (if not specified, then default MONGO_URI connection will be used)
| MONGO_ACCOUNTS_COLLECTION_PREFIX   | the collection prefix for accounts collection in mongo (If not specified, then the default MONGO_COLLECTION_PREFIX will be used)
| MONGO_DATA_URI   | the URI string for mongo connection, which holds data collections (for instance, processed block's height). In case, it's not specified, then default MONGO_URI connection will be used)
| MONGO_DATA_COLLECTION_PREFIX   | the collection prefix for data collections in mongo (If not specified, then the default MONGO_COLLECTION_PREFIX will be used)
| NODERED_MONGO_URI   | the URI string for mongo connection, which holds data collections (for instance, processed block's height). In case, it's not specified, then default MONGO_URI connection will be used)
| NODE_RED_MONGO_COLLECTION_PREFIX   | the collection prefix for node-red collections in mongo (If not specified, then the collections will be created without prefix)
| REST_PORT   | rest plugin port
| NETWORK   | network name (alias)- is used for connecting via ipc (see block processor section)
| NODERED_AUTO_SYNC_MIGRATIONS   | autosync migrations on start (default = yes)
| RPC | rpc path for node waves api 
| BLOCK_GENERATION_TIME | generation time for block
License
----
 [GNU AGPLv3](LICENSE)

Copyright
----
LaborX PTY