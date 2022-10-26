### Soroban for IFTTT

An example template project of IFTTT API, demonstrating Soroban smart contracts integrated as IFTTT triggers and actions. Fork/copy this repo create your own IFTTT API service implementation for your contracts.

The example template is comprised of these components:

1. IFTTT PaaS.
2. IFTTT Service API implementation, a web service we host to front our custom smart contract application. 
   It is implemented in this repo as server.js, and is basically some webhooks that IFTTT will call for triggers, actions.
3. Soroban RPC Server, this is invoked by the IFTTT Service to resolve triggers, actions, queries.
4. Soroban Core, this is a node on the blockchain network, Soroban RPC server connects to it.
   The smart contract is stored and executed on the blockchain.
5. A smart contract, this represents the application and what IFTTT triggers and actions can be wired up with.
   The contract is a standalone program written in Rust, with functions representing what the application can do. 
   It can be compiled to wasm and deployed onto the blockchain, where it can then be invoked as an operation on a transaction.  

For standing up this example, the following steps:

* Fork/copy/clone this repo to your own workspace.

* Launch [quickstart image for soroban development](https://github.com/stellar/quickstart#soroban-development) on your local machine for `standalone` and `futurenet` networks:
   The image will provide an instance of soroban-rpc pre-connected to the network you specify as param(`--standalone` or `--futurenet`) and exposed on a local port of your machine via the docker `-p "<your_local_port>:8000"`.
   ```
   # futurenet instance
   docker run --platform linux/amd64 --rm -it -p "8001:8000" --name stellar_futurenet stellar/quickstart:soroban-dev --futurenet --enable-soroban-rpc 

   # your own standalone instance
   docker run --platform linux/amd64 --rm -it -p "8000:8000" --name stellar_standalone stellar/quickstart:soroban-dev --standalone --enable-soroban-rpc 
   ```

* Use [Laboratory Generate Keypair](https://laboratory.stellar.org/#account-creator?) to generate a new test account key pair to be used as 
this application's service account. It will be used for signing tx's sent to network. Fund the new account by invoking the Friendbot url hosted on your Quickstart services:  
```
GET http://localhost:8000/friendbot?addr=<keypair_public key>
GET http://localhost:8001/friendbot?addr=<keypair_public key>
```

* start this IFTTT API web service on your local machine using at least node v12 and npm:
```
STANDALONE_RPC_URL=http://localhost:8000/soroban/rpc \ 
STANDALONE_SOURCE_KEY=<keypair_secret_key> \
STANDALONE_NETWORK_PASSPHRASE="Standalone Network ; February 2017" \
FUTURENET_RPC_URL=http://localhost:8001/soroban/rpc \ 
FUTURENET_SOURCE_KEY=<keypair_secret_key> \
FUTURENET_NETWORK_PASSPHRASE="Test SDF Future Network ; October 2022" \
IFTTT_SERVICE_KEY=<your_ifttt_api_service_key> \
PORT=3000 \
npm start

```

* Use ngrok on your local machine to temporarily publish this IFTTT API web service onto a temporary internet routable address, assuming you used port 3000 on startup - `ngrok http 3000`. Consider getting a free account on ngrok, that way this url won't expire after one hour. 


* Compile the smart contract to wasm - [https://soroban.stellar.org/docs/tutorials/build](https://soroban.stellar.org/docs/tutorials/build):
  * Go into smart_contract/increment_by directory and `cargo build --target wasm32-unknown-unknown --release`  
  * It is a simple contract that has one function:  
    `fn increment(by: u64) -> u64 `  
    It accepts an integer, and adds it to a persistent state counter and returns the new summed state value.
    
* Deploy the contract to the networks via the running local rpc servers and your test keypair account info - [https://soroban.stellar.org/docs/tutorials/deploy-to-local-network](https://soroban.stellar.org/docs/tutorials/deploy-to-local-network)
   The cli will show the new contract id as a result, save that as will refer to it in later IFTTT trigger/action config.

* Create an IFTTT free account, in IFTTT->Developers->API, set the API URL to be the ngrok public https url it created. You can also find your IFTTT_SERVICE_KEY provided here on this screen.
   
* In IFTTT->API->Triggers, create one trigger which represents a smart contract invocation. The smart contract events are emitted from `/ifttt/v1/triggers/contract_incremented_event` handler in server.js
  
  * Define optional Trigger Fields if you want to enable network choice(standalone and/or futurenet) and/or contract id to be specified by end user during IFTTT applet creation. 
    Otherwise, skip creating trigger fields in IFTTT for these and change `/ifttt/v1/triggers/contract_incremented_event` handler in server.js to hardcode values for network and contract id instead.
  
  * Define at least one Ingredient based on this sample emitted contract event model from the server.js in the api:

    ```
    event = {
          "increment_amount": "1",
          "contract_id": "...", 
          "network": "standalone", 
          "total": "2",
          "transaction_id": "...",
          "timestamp": "2022-10-25 09:26:28 PDT",
       }
    ```
    Ingredients can be used in variable/tag substitutions by end users when they define action handlers against this smart contract trigger in IFTTT applets.
   
   
* In IFTTT->API->Actions, create one action for invoking the contract's `increment` function. 
  This will refer to `/ifttt/v1/actions/invoke_contract_increment` handler in server.js
  Define at least one Action field for `increment_amount` so, the IFTTT end user can specify the value passed to the contract function in their 'Then That' config of their applet.  
  You can define optional Action fields for Network and ContractID also or hardcode them into the server.js handler to keep this example simple and less for IFTTT user to choose/config when they create their applet . 
  
  
* in IFTTT->My Applets, create two new applets to demonstrate round trip:
  * Executing the contract:
    * `If This` - choose a trigger from the IFTTT service catalog which will initiate the contract getting invoked. 
      Google Tasks Creation, SMS Received, are two easy ones, etc.
    * `Then That` - choose your new service action for invoking the contract. 
      Optionally specify the increment amount input on the action to be a variable substitution from an ingredient supplied by the trigger.
  * Execute something else based on contract event:
    * `If This` - choose the new service trigger you defined for contract.
    * `Then That` - choose any action from the IFTT service catalog to execute.
      Optionally, specify an ingredient from the contract event trigger as a variable substitution in one of the action field inputs.
      
    
    
  






