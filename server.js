// server.js

const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();

const middleware = require('./middleware');
const helpers = require('./helpers');

const SorobanClient = require('soroban-client')
const {formatInTimeZone} = require('date-fns-tz')

// optionally hardcode to a single network config for simpler example
// demo'ing how could be configurable for multiple.
const NetworkConfig = {};
NetworkConfig["standalone"] = {
  rpc_url: process.env.STANDALONE_RPC_URL,
  source_key: process.env.STANDALONE_SOURCE_KEY,
  network_passphrase: process.env.STANDALONE_NETWORK_PASSPHRASE
}
NetworkConfig["futurenet"] = {
  rpc_url: process.env.FUTURENET_RPC_URL,
  source_key: process.env.FUTURENET_SOURCE_KEY,
  network_passphrase: process.env.FUTURENET_NETWORK_PASSPHRASE
}

const tempContractEvents = new Map();
const IFTTT_SERVICE_KEY = process.env.IFTTT_SERVICE_KEY;
const TEST_CONTRACTID = "bfe2b969bf755db902578ad8d744e2a813fb5104d0c28fd1f980914333298bca"
const TEST_NETWORK = "standalone"

app.use(bodyParser.json());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '/views'));

// The status
app.get('/ifttt/v1/status', middleware.serviceKeyCheck, (req, res) => {
  res.status(200).send();
});

// The test/setup endpoint
app.post('/ifttt/v1/test/setup', middleware.serviceKeyCheck, async (req, res, next) => {
  res.status(200).send({
    "data": {
      samples: {
        actionRecordSkipping: {
          invoke_contract_increment: { 
            network: TEST_NETWORK ,
            contract_id: TEST_CONTRACTID,
            increment_amount: "5"
          }
        },
        actions: {
          invoke_contract_increment: { 
            network: TEST_NETWORK ,
            contract_id: TEST_CONTRACTID,
            increment_amount: "5"
          }
        },
        triggers: {
          contract_incremented_event: { 
            network: TEST_NETWORK ,
            contract_id: TEST_CONTRACTID,
          }
        }
      }
    }
  });
});

// Trigger endpoints
app.post('/ifttt/v1/triggers/contract_incremented_event', async (req, res, next) => {
  
  const key = req.get("IFTTT-Service-Key");
  
  if (key !== IFTTT_SERVICE_KEY) {
    res.status(401).send({
      "errors": [{
        "message": "Channel/Service key is not correct"
      }]
    });
    return;
  }

  let data = [],
      numOfItems = req.body.limit;
  
  if (typeof numOfItems === "undefined") { // Setting the default if limit doesn't exist.
    numOfItems = 3;
  }
  
  try {
    let contractId = req.body.triggerFields.contract_id; // optionally hardcode instead of being request field
    let network = req.body.triggerFields.network; // optionally hardcode instead of being request field

    console.log("Trigger requested  " + contractId + " " + network);

    networkConfig = NetworkConfig[network];
    if (!networkConfig) {
      throw new Error("invalid network");
    }
    
    let server = new SorobanClient.Server(networkConfig.rpc_url, {allowHttp: true});
    // when available, call rpc server for events

    // for temp fix now, the action is saving into a local events in memory, to read here..
    events = tempContractEvents.get(network + contractId) || [];    

  } catch (error) {
    console.log('Trigger response err ');
    console.log(error);
    res.status(400).send({
      "errors": [{
        "message": error.message
      }]
    });
    return;
  }
  
  for (let i = 0; i < numOfItems && i < events.length; i++) {
      event = events[i];
      data.push(event);
  }

  res.status(200).send({
    "data": data,
  });

});


// Query endpoints
app.post('/ifttt/v1/queries/contract_increment_balance', async (req, res, next) => {

  const key = req.get("IFTTT-Service-Key");

  if (key !== IFTTT_SERVICE_KEY) {
    res.status(401).send({
      "errors": [{
        "message": "Channel/Service key is not correct"
      }]
    });
    return;
  }
  
  let data = [],
    numOfItems = req.body.limit;
  
  if (typeof numOfItems === "undefined") { // Setting the default if limit doesn't exist.
    numOfItems = 3;
  }
  
  // Query not implemented yet, this is boilerplate placeholder until real.

  if (numOfItems >= 1) {
    for (let i = 0; i < numOfItems; i += 1) {
      data.push({
        "created_at": (new Date()).toISOString(), // Must be a valid ISOString
        "meta": {
          "id": helpers.generateUniqueId(),
          "timestamp": Math.floor(Date.now() / 1000) // This returns a unix timestamp in seconds.
        }
      });
    }
  }
  
  let cursor = null
  
  if (req.body.limit == 1) {
    cursor = helpers.generateUniqueId()
  }
  
  res.status(200).send({
    "data": data,
    "cursor": cursor
  });
});


// Action endpoints
app.post('/ifttt/v1/actions/invoke_contract_increment', async (req, res, next) => {
  
  let key = req.get("IFTTT-Service-Key");
  
  if (key !== IFTTT_SERVICE_KEY) {
    res.status(401).send({
      "errors": [{
        "message": "Channel/Service key is not correct"
      }]
    });
    return;
  }

  let account, transaction, server, contractId, network, incrementAmount, userTimeZone;

  try {
    contractId = req.body.actionFields.contract_id; // optionally hardcode for simpler demo, doesn't need to be request field
    network = req.body.actionFields.network; // optionally hardcode for simpler demo, doesn't need to be request field
    incrementAmount = Number(req.body.actionFields.increment_amount);
    userTimeZone = req.body.user.timezone; // this is supplied by IFTTT based on the User that created the applet

    console.log("received action " + contractId + " " + network + " " + incrementAmount + " ");

    if (!incrementAmount) {
        incrementAmount = 1;
    }

    networkConfig = NetworkConfig[network];
    if (!networkConfig) {
        throw new Error("invalid network");
     }

     let keyPair = SorobanClient.Keypair.fromSecret(networkConfig.source_key);
     server = new SorobanClient.Server(networkConfig.rpc_url, {allowHttp: true});
     let stellarAccount = await server.getAccount(keyPair.publicKey());
     account = new SorobanClient.Account(keyPair.publicKey(), stellarAccount.sequence);
     transaction = buildInvokeContractIncrementTx(contractId, account, keyPair, incrementAmount, networkConfig.network_passphrase);
  } catch (error) {
    console.log("received action error");  
    console.log(error);
    res.status(400).send({
      "errors": [{
        "message": error.message
      }]
    });
    return;
  }

  server
      .sendTransaction(transaction)
      .then(function() {
        event = {
          "increment_amount": incrementAmount.toString(),
          "contract_id": contractId, 
          "network": network, 
          "total": "0",
          "transaction_id": transaction.hash().toString('hex'),
          "timestamp": formatInTimeZone(Date.now(), userTimeZone, 'yyyy-MM-dd HH:mm:ss zzz'),
          "meta": {
            "id": transaction.hash().toString('hex'),
            "timestamp": Math.floor(Date.now() / 1000) // This returns a unix timestamp in seconds.
          }
        }
        // temp local hack until events are published by soroban-rpc
        publishEvent(event, server).catch(error => console.log(error))
        res.status(200).send({
          "data": [{
            "id": transaction.hash().toString('hex')
          }]
        });
      })
      .catch(function(err) {
        console.log('Transaction submit err ');
        console.log(err);
        res.status(500).send({
          "errors": [{
            "message": err
          }]
        });
      });
});

async function publishEvent(event, server) {
  // TODO, this is a temporary workaround for providing contract events just for this demo purposes.
  // It simulates very limited contract events by capturing them from every prior IFTTT API contract invocation request.
  // So, it will not have events for invocations of the contract that occurred on the network but through other clients, i.e. not through this API service.
  // Need to use soroban-rpc events once they are available from the API instead.
  ctr = 0;
  let response;
  while(ctr < 10) {
    try {
      response = await server.getTransactionStatus(event.meta.id);
      if (response.status == "success") {
        break;
      }
      throw new Error(response.status);
    } catch (error) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      ctr++;
    }
  }

  if (!response || response.status != "success") {
    throw new Error("tx hash " + event.meta.id + " was not successful on network after 10 tries");
  }

  console.log("successful tx:");
  console.log(response);

  latestContractValue = SorobanClient.xdr.ScVal.fromXDR(input=response.results[0].xdr, format="base64");
  event.total = latestContractValue.obj().u64().toString();

  if (!tempContractEvents.has(event.network + event.contract_id)) {
    tempContractEvents.set(event.network + event.contract_id, []);
  }

  events = tempContractEvents.get(event.network + event.contract_id);
  events.unshift(event);

  if (events.length > 50) {
    events = events.slice(0,50);
    tempContractEvents.set(event.network + event.contract_id, events);
  }
}

// Build a Transaction with new InvokeHostFunction Operation for invoking the smart contract method on network.
function buildInvokeContractIncrementTx(contractId, account, keyPair, incrementAmount, networkPassphrase) {

  let opts = {
    function: SorobanClient.xdr.HostFunction.hostFnInvokeContract(),
    parameters: [],
    footprint: new SorobanClient.xdr.LedgerFootprint({ readOnly: [], readWrite: [] })
  };

  let contractIdObj = SorobanClient.xdr.ScVal.scvObject(
    SorobanClient.xdr.ScObject.scoBytes(Buffer.from(contractId, 'hex')));
  opts.parameters.push(contractIdObj);

  let contractFnNameObj = SorobanClient.xdr.ScVal.scvSymbol("increment");
  opts.parameters.push(contractFnNameObj);

  let contractIncrementParameterObj = SorobanClient.xdr.ScVal.scvObject(
    SorobanClient.xdr.ScObject.scoU64(new SorobanClient.xdr.Uint64(incrementAmount))
  );
  opts.parameters.push(contractIncrementParameterObj);
  
  let contractCodeFootprint = SorobanClient.xdr.ScVal.scvStatic(SorobanClient.xdr.ScStatic.scsLedgerKeyContractCode());
  let incrementStateFootprint = SorobanClient.xdr.ScVal.scvSymbol("COUNTER");
  opts.footprint.readOnly().push(SorobanClient.xdr.LedgerKey.contractData(new SorobanClient.xdr.LedgerKeyContractData({contractId: Buffer.from(contractId, 'hex'), key: contractCodeFootprint})))
  opts.footprint.readWrite().push(SorobanClient.xdr.LedgerKey.contractData(new SorobanClient.xdr.LedgerKeyContractData({contractId: Buffer.from(contractId, 'hex'), key: incrementStateFootprint})))
 
  let transaction = new SorobanClient.TransactionBuilder(account, {
      fee: 100,
      networkPassphrase: networkPassphrase,
      v1: true
    })
      .addOperation(
        SorobanClient.Operation.invokeHostFunction(opts)
      )
      .setTimeout(SorobanClient.TimeoutInfinite)
      .build();

  transaction.sign(keyPair);
  return transaction;
}  

// listen for requests :)
// placeholder for publishing resources for dapp launch page
app.get('/', (req, res) => {
  res.render('index.ejs');
});

const listener = app.listen(process.env.PORT, function() {
  console.log('Your app is listening on port ' + listener.address().port);
});
