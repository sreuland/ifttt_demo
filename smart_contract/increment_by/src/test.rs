#![cfg(test)]

use super::{IncrementContractBy, IncrementContractByClient};
use soroban_sdk::{testutils::Logger, Env};

extern crate std;

#[test]
fn test() {
    let env = Env::default();
    let contract_id = env.register_contract(None, IncrementContractBy);
    let client = IncrementContractByClient::new(&env, &contract_id);

    let first: u64 = 3;
    let second: u64 = 1;
    let third: u64 = 1000;


    assert_eq!(client.increment(&first), 3);
    assert_eq!(client.increment(&second), 4);
    assert_eq!(client.increment(&third), 1004);

    std::println!("{}", env.logger().all().join("\n"));
}
