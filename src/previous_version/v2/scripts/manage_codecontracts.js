import {scan_for_servers} from "/src/previous_version/v2/scripts/util/scan_for_servers"

// Find Largest Prime Factor
// Subarray with Maximum Sum
// Total Ways to Sum
// Total Ways to Sum II
// Spiralize Matrix
// Array Jumping Game
// Array Jumping Game II
// Merge Overlapping Intervals
// Generate IP Addresses
// Algorithmic Stock Trader I
// Algorithmic Stock Trader II
// Algorithmic Stock Trader III
// Algorithmic Stock Trader IV
// Minimum Path Sum in a Triangle
// Unique Paths in a Grid I
// Unique Paths in a Grid II
// Shortest Path in a Grid
// Sanitize Parentheses in Expression
// Find All Valid Math Expressions
// HammingCodes: Integer to Encoded Binary
// HammingCodes: Encoded Binary to Integer
// Proper 2-Coloring of a Graph
// Compression I: RLE Compression
// Compression II: LZ Decompression
// Compression III: LZ Compression
// Encryption I: Caesar Cipher
// Encryption II: Vigenère Cipher


/** @param {import("@ns").NS} ns */
export async function main(ns) {
  const UPDATE_HANDLER = ns.getPortHandle(4)
  const TESTING = true

  let servers = scan_for_servers(ns)
  
  // Only look for contracts on the home server while testing
  if (TESTING) {
    servers = ["home"]
  }

  let dispatched_contracts = []

  while (true) {
    let contracts_to_persist = []
    for (let server of servers) {
      let files = ns.ls(server,".cct")
      if (files.length > 0) {
        for (let file of files) {
          // File is new to us, dispatch a solver
          if (!dispatched_contracts.includes(file)) {
            let update = {
              "action": "request_action",
              "request_action": {
                "script_action": "cctsolv",
                "target": server, // Server we found the contract on
                "filename": file, // .cct file we found
                "contract_type": ns.codingcontract.getContractType(file,server),
                "contract_data": ns.codingcontract.getData(file,server),
                "contract_attempts": ns.codingcontract.getNumTriesRemaining(file,server),
                "threads": 1
              }
            }

            while(!UPDATE_HANDLER.empty()) {
              await ns.sleep(100)
            }
            while(!UPDATE_HANDLER.tryWrite(JSON.stringify(update))) {
              await ns.sleep(100)
            }

            // We want to know we've already dispatched a solver for this contract
            contracts_to_persist.push(file)
          }
          // File was persisted from previous loop iteration and still exists, so we persist again
          else {
            contracts_to_persist.push(file)
          }
        }
      }
    }
    dispatched_contracts = contracts_to_persist
    await ns.sleep(10000)
  }
}