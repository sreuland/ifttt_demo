Welcome to Soroban for IFTTT, an example template demonstrating Soroban smart contracts as IFTTT triggers and actions.

If you're reading this document on platform.ifttt.com, go ahead and click the _Remix to Edit_ button in the upper right hand corner.

That will clone this project and create your own version on your Glitch profile.

The example is comprised of these components:

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

* Remix this glitch to your own glitch account.

* Create an IFTTT free account, create an IFTTT API service in your account and set the API address=glitch project url.

* Launch [quickstart image for soroban development](https://github.com/stellar/quickstart#soroban-development) on your local.
   This will provide the instance of soroban-rpc pre-connected to the network you chose(`--standalone` or `--futurenet`) and on port 8000 of your local.

* Use [Laboratory Generate Keypair](https://laboratory.stellar.org/#account-creator?) to generate a new test account key pair to be used as 
this application's service account. It will be used for signing tx's sent to network. Fund the new account by invoking the Friendbot url hosted on the Quickstart service:  
`GET http://localhost:8000/friendbot?addr=<public key>`

* Use ngrok on your local to temporarily publish the rpc url from quickstart onto a internet routable address, assuming you used port 8000 for quickstart - `ngrok http 8000` 

* Edit the .env file, set network passphrase, secret key, and set the rpc url to your published ngrok address.

* Compile the smart contract to wasm - [https://soroban.stellar.org/docs/tutorials/build](https://soroban.stellar.org/docs/tutorials/build):
  * Go into smart_contract/increment_by directory and `cargo build --target wasm32-unknown-unknown --release`  
  * It is a simple contract that has one function:  
    `fn increment(by: u64) -> u64 `  
    It accepts an integer, and adds it to a persistent state counter and returns the new summed state value.
    
* Deploy the contract to the network via the running local rpc server and your test account info - [https://soroban.stellar.org/docs/tutorials/deploy-to-local-network](https://soroban.stellar.org/docs/tutorials/deploy-to-local-network)
   the cli will show the new contract id as a result, save that as will refer to it in later IFTTT trigger/action config.
   
* In IFTTT->API->Triggers, create one trigger which represents a smart contract invocation. The smart contract events are emitted from `/ifttt/v1/triggers/contract_incremented_event` handler in server.js
  
  * Define optional Trigger Fields if you want to enable network or contract id to be specified by end user during IFTTT applet creation. 
    Otherwise, skip creating trigger fields, change `/ifttt/v1/triggers/contract_incremented_event` handler in server.js to hardcode values for network and contract id instead.
  
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
  Define at least one Action field for `increment_amount` so, the end user can specify the value passed to the contract function.
  Hardcode the contract_id and network in the server.js handler to keep this example simple. 
  
  
* in IFTTT->My Applets, create two new applets to demonstrate round trip:
  * Executing the contract:
    * `If This` - choose a trigger from the IFTTT service catalog which will initiate the contract getting invoked. 
      Google Tasks Creation, SMS Received, etc.
    * `Then That` - choose your new service action for invoking the contract. 
      Optionally specify the increment amount input on the action to be a variable substitution from an ingredient supplied by the trigger.
  * Execute something else based on contract event:
    * `If This` - choose the new service trigger you defined for contract.
    * `Then That` - choose any action from the IFTT service catalog to execute.
      Optionally, specify an ingredient from the contract event trigger as a variable substitution in one of the action field inputs.
      
    
    
  






