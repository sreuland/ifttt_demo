#![no_std]
use soroban_sdk::{contractimpl, log, symbol, Env, Symbol};

const COUNTER: Symbol = symbol!("COUNTER");

pub struct IncrementContractBy;

#[contractimpl]
impl IncrementContractBy {
    /// Increment increments an internal counter, and returns the value.
    pub fn increment(env: Env, by: u64) -> u64 {
        // Get the current count.
        let mut count: u64 = env
            .data()
            .get(COUNTER)
            .unwrap_or(Ok(0)) // If no value set, assume 0.
            .unwrap(); // Panic if the value of COUNTER is not u32.
        log!(&env, "count: {}", count);

        // Increment the count.
        count += by;

        // Save the count.
        env.data().set(COUNTER, count);

        // Return the count to the caller.
        count
    }
}

mod test;
