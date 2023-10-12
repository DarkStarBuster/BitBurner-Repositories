/** @param {NS} ns */
export async function main(ns) {
  const CONTROL_PARAMETERS = ns.getPortHandle(1)

  while(!CONTROL_PARAMETERS.empty()) {
    CONTROL_PARAMETERS.clear()
  }

  CONTROL_PARAMETERS.write(
    JSON.stringify({
      "home": {
        "free_amt": 16
      },
      "hacker": {
        "consider_early": 64, // Amount of RAM on home that we considers being below as being "early" in a run
        "hack_batch_time_interval": 500, // Milliseconds between hack batches
        "total_hack_batch_limit": 8000 / 4, // <Total number of scripts we want running at any one time> / <4 as each hack batch runs 4 scripts>
        "min_hack_threads_for_batch": 1 // Minimum number of Hack Threads to use when initially constructing a hack batch
      },
      "pserv": { // Parameters for the Personal Server Manager
        "max_ram_exponent_to_purchase": 20,
        "min_amt_to_purchase_new": 2e6,
        "ram_exponent_of_new_servers": 1,
        "mult_for_purchase_upg": 10 
      },
      "hacknet": { // Parameters for the Hacknet Manager
        "calc_only": false, // When true, we just report the most 'optimal' purchase instead of actually purchasing it
        "threshold": 5e-6, // Equivilant to 200000 seconds to payitself back
        "cost_mod" : 2     // We want to have cost_mod * cost available before we purchase the upgrade
      }
    })
  )
}