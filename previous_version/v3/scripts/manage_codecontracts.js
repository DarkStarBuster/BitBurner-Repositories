import { scan_for_servers } from "/src/scripts/util/scan_for_servers"
import { PORT_IDS } from "/src/scripts/util/port_management"
import { COLOUR, colourize } from "/src/scripts/util/colours"
import { release_ram, request_ram } from "/src/scripts/util/ram_management"

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

/**
 * 
 * @param {import("@ns").NS} ns 
 * @param {string} file 
 * @param {string} server 
 * @returns Boolean representing if our Code Contract Solver can handle a certain Contract Type
 */
function we_can_solve_this(ns, file, server) {
  switch (ns.codingcontract.getContractType(file,server)) {
    case "Find Largest Prime Factor":
    case "Subarray with Maximum Sum":
    case "Total Ways to Sum":
    case "Total Ways to Sum II":
    case "Spiralize Matrix":
    case "Array Jumping Game":
    case "Array Jumping Game II":
    case "Merge Overlapping Intervals":
    case "Minimum Path Sum in a Triangle":
    case "Unique Paths in a Grid I":
    case "Unique Paths in a Grid II":
    case "Shortest Path in a Grid":
    case "Encryption I: Caesar Cipher":
    case "Encryption II: Vigenère Cipher":
      return true
    default:
      return false
  }
}

/** @param {import("@ns").NS} ns */
export async function main(ns) {
  const TESTING = false

  ns.disableLog("ALL")
  ns.enableLog("exec")

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
          // File is new to us and we believe we can solve it.
          ns.print("INFO Found " + file + " on " + server)
          if (
              !dispatched_contracts.includes(file)
          &&  we_can_solve_this(ns, file, server)
          ) {
            ns.print("Attempt to solve it!")
            let ram_needed = ns.getScriptRam("/scripts/solve_cct.js")
            let response = await request_ram(ns, ram_needed, true)

            let launch_solver = false
            let server_to_use
            if (response.result === "OK") {
              ns.print("INFO Obtained RAM for a Solver.")
              launch_solver = true
              server_to_use = response.server
            }
            else {
              ns.print("WARN Failed to obtain RAM for a Solver.")
            }

            if (launch_solver) {
              let contract_info = {
                "contract_server"  : server
               ,"contract_file"    : file
               ,"contract_type"    : ns.codingcontract.getContractType(file,server)
               ,"contract_data"    : ns.codingcontract.getData(file,server)
               ,"contract_attempts": ns.codingcontract.getNumTriesRemaining(file,server)
              }
              // ns.tprint(
              //   "Contract Server : " + server + "\n"
              // + "Contract File   : " + file + "\n" 
              // + "Contract Type   : " + ns.codingcontract.getContractType(file,server) + "\n" 
              // + "Contract Data   : " + ns.codingcontract.getData(file,server) + "\n" 
              // )
              let solver_pid = ns.exec("/scripts/solve_cct.js", server_to_use, 1, ...["--contract_info",JSON.stringify(contract_info)])

              if (!(solver_pid === 0)) {
                while(ns.isRunning(solver_pid)) {
                  await ns.sleep(50)
                }

                response = undefined
                response = await release_ram(ns, server_to_use, ram_needed)
                if (response.result === "OK") {
                  ns.print("INFO Released RAM successfully.")
                }
                else {
                  ns.tprint("ERROR Contract Solver was not allowed to release " + ram_needed + " RAM on " + server_to_use)
                }

                if (ns.fileExists(file,server)) {
                  ns.print("ERROR We have failed to solve " + file + " on " + server)
                  contracts_to_persist.push(file)
                }
                else {
                  ns.print("INFO We have sucessfully completed " + file + " on " + server)
                }
              }
              else {
                ns.print("ERROR We failed to launch contract solver for " + file + " on " + server)

                response = undefined
                response = await release_ram(ns, server_to_use, ram_needed)
              }
            }
          }
          else if (!we_can_solve_this(ns, file, server)) {
            ns.print(
              "Cannot solve it yet.\n"
            + "Type: " + ns.codingcontract.getContractType(file,server) + "\n"
            + "Data: \n" + ns.codingcontract.getData(file,server) + "\n"
            + ns.codingcontract.getData(file,server).length + "\n"
            + "Desc: \n" + ns.codingcontract.getDescription(file,server)
            )
          }
          // File was persisted from previous loop iteration and still exists, so we persist again
          else if(
              dispatched_contracts.includes(file)
          &&  we_can_solve_this(ns, file, server)
          ) {
            contracts_to_persist.push(file)
          }
        }
      }
    }
    dispatched_contracts = contracts_to_persist
    await ns.sleep(10000)
  }
}