import { PORT_IDS } from "/src/scripts/util/dynamic/manage_ports"
const DEPTH_LIMIT = 50

export class ScanFilter {
  is_rooted       = undefined;
  is_rootable     = undefined;
  is_hackable     = undefined;
  has_money       = undefined;
  has_ram         = undefined;
  include_home    = undefined;
  include_pserv   = undefined;
  include_hacknet = undefined;

  constructor() {}
}

/**
 * @param {import("@ns").NS} ns 
 * @param {ScanFilter} filter 
 * @returns {Promise<string[]>} A list of server names that match the given filter
 */
export async function request_scan(ns, filter = new ScanFilter()) {
  const SCAN_REQUEST_HANDLER = ns.getPortHandle(PORT_IDS.SCAN_REQUEST_HANDLER)
  const SCAN_PROVIDE_HANDLER = ns.getPortHandle(PORT_IDS.SCAN_PROVIDE_HANDLER)

  SCAN_PROVIDE_HANDLER.clear()
  SCAN_REQUEST_HANDLER.clear()

  let request = {
    action : "scan_request"
   ,payload: {
      requester: ns.pid
     ,filters  : filter
    }
  }
  
  // for (let name in request) {
  //   if (typeof request[name] == typeof {}) {
  //     for (let name2 in request[name]) {
  //       ns.tprint(`${name}.${name2}: ${request[name][name2]}`)
  //     }
  //   }
  //   else {
  //     ns.tprint(`${name}: ${request[name]}`)
  //   }
  // }

  while (!SCAN_REQUEST_HANDLER.tryWrite(JSON.stringify(request))) {await ns.sleep(4)}
  
  let recieved_response = false
  let response
  while (!recieved_response) {
    while (SCAN_PROVIDE_HANDLER.empty()) {
      await ns.sleep(4)
    }
    response = JSON.parse(SCAN_PROVIDE_HANDLER.peek())
    if (
        response.action == "scan_response"
    &&  response.payload.requester == ns.pid
    ) {
      SCAN_PROVIDE_HANDLER.read()
      recieved_response = true
    }
    await ns.sleep(4)
  }
  
  // for (let name in response) {
  //   if (typeof response[name] == typeof {}) {
  //     for (let name2 in response[name]) {
  //       ns.tprint(`${name}.${name2}: ${response[name][name2]}`)
  //     }
  //   }
  //   else {
  //     ns.tprint(`${name}: ${response[name]}`)
  //   }
  // }

  return Promise.resolve(response.payload.result)
}


/**
 * @param {import("@ns").NS} ns - NetScript environment
 * @param {string} server - Server to scan from
 * @param {ScanFilter} filters - Filters to apply (AND logic applies if multiple are definted)
 * @param {string[]} servers - Servers we have already visited
 * @param {string[]} results - The results of this recursive scan
 * @param {number} depth - depth of our current recursion
 * @param {number} depth_limit - limit of our recursion
 */
function scan_for_servers_recur(ns, server, filters = {}, servers = [], results = [], depth = 0, depth_limit = DEPTH_LIMIT) {
  let scan_results = ns.scan(server)

  let port_opener_cnt = 0
  if(ns.fileExists("BruteSSH.exe") ) {port_opener_cnt + 1}
  if(ns.fileExists("FTPCrack.exe") ) {port_opener_cnt + 1}
  if(ns.fileExists("relaySMTP.exe")) {port_opener_cnt + 1}
  if(ns.fileExists("HTTPWorm.exe") ) {port_opener_cnt + 1}
  if(ns.fileExists("SQLInject.exe")) {port_opener_cnt + 1}

  // Loop over the servers we can see.
  for (let scan_result of scan_results) {
    // Have we encountered this server before in our search?
    if (!servers.includes(scan_result)) {
      // Record that we've encountered this server while searching.
      servers.push(scan_result)

      // Do we want to include this server in the result set?
      let fail_filter_cnt = 0
      for (let filter in filters) {
        switch (filter) {
          case "is_rooted":
            if (ns.hasRootAccess(scan_result) === filters[filter]) {
              continue
            }
            //ns.print("Failed due to root")
            fail_filter_cnt += 1
            break
          case "is_rootable":
            if ((ns.getServerNumPortsRequired(scan_result) <= port_opener_cnt) === filters[filter]) {
              continue
            }
            fail_filter_cnt += 1
            break
          case "is_hackable":
            if ((ns.getServerRequiredHackingLevel(scan_result) < ns.getHackingLevel()) === filters[filter]) {
              continue
            }
            fail_filter_cnt += 1
            break
          case "has_money":
            if ((ns.getServerMaxMoney(scan_result) > 0) === filters[filter]) {
              continue
            }
            //ns.print("Failed due to money")
            fail_filter_cnt += 1
            break
          case "has_ram":
            if ((ns.getServerMaxRam(scan_result) > 0) === filters[filter]) {
              continue
            }
            //ns.print("Failed due to ram")
            fail_filter_cnt += 1
            break
          case "include_home":
            continue // home is dealt with outside of the recursion function.
          case "include_pserv":
            if (
                scan_result.includes("pserv") === filters[filter]
            ||  !scan_result.includes("pserv")
            ) {
              continue
            }
            //ns.print("Failed due to pserv")
            fail_filter_cnt += 1
            break
          case "include_hacknet":
            if (
                scan_result.includes("hacknet") === filters[filter]
            ||  !scan_result.includes("hacknet")
            ) {
              continue
            }
            //ns.print("Failed due to hacknet")
            fail_filter_cnt += 1
            break
          default:
            //ns.print("Failed due to default")
            fail_filter_cnt += 1
            break
        }
        if (fail_filter_cnt > 0) {
          //ns.print("Server: " + scan_result + " Fail Cnt: " + fail_filter_cnt)
          break
        }
      }

      // No filters failing means we add it to the results
      if (fail_filter_cnt == 0) {
        results.push(scan_result)
      }

      // Recur one level deeper if we have not yet reached the depth_limit
      if (depth < depth_limit) {
        scan_for_servers_recur(ns, scan_result, filters, servers, results, depth + 1, depth_limit)
      }
    }
  }

  return results
}

/**
 * Always starts from "home".
 * 
 * @param {import("@ns").NS} ns - NetScript environment
 * @param {ScanFilter} filters - Filters to apply (AND logic applies if multiple are definted)
 * @return {string[]}
 */
export function scan_for_servers(ns, filters = {}) {
  let servers = ["home"]
  let results = []

  let port_opener_cnt = 0
  if(ns.fileExists("BruteSSH.exe") ) {port_opener_cnt + 1}
  if(ns.fileExists("FTPCrack.exe") ) {port_opener_cnt + 1}
  if(ns.fileExists("relaySMTP.exe")) {port_opener_cnt + 1}
  if(ns.fileExists("HTTPWorm.exe") ) {port_opener_cnt + 1}
  if(ns.fileExists("SQLInject.exe")) {port_opener_cnt + 1}

  // Do we want to include "home" in the result set?
  let fail_filter_cnt = 0
  for (let filter in filters) {
    switch (filter) {
      case "is_rooted":
        if (ns.hasRootAccess("home") === filters[filter]) {
          continue
        }
        fail_filter_cnt += 1
        break
      case "is_rootable":
        if ((ns.getServerNumPortsRequired("home") <= port_opener_cnt) === filters[filter]) {
          continue
        }
        fail_filter_cnt += 1
        break
      case "is_hackable":
        if ((ns.getServerRequiredHackingLevel("home") < ns.getHackingLevel()) === filters[filter]) {
          continue
        }
        fail_filter_cnt += 1
        break
      case "has_money":
        if ((ns.getServerMaxMoney("home") > 0) === filters[filter]) {
          continue
        }
        fail_filter_cnt += 1
        break
      case "has_ram":
        if ((ns.getServerMaxRam("home") > 0) === filters[filter]) {
          continue
        }
        fail_filter_cnt += 1
        break
      case "include_home":
        if (filters[filter]) {
          continue
        }
        fail_filter_cnt += 1
        break
      case "include_pserv":
        continue
        break
      case "include_hacknet":
        continue
        break
      default:
        fail_filter_cnt += 1
        break
    }
    if (fail_filter_cnt > 0) {
      break
    }
  }

  // No filters failing means we add it to the results
  if (fail_filter_cnt == 0) {
    results.push("home")
  }

  return scan_for_servers_recur(ns, "home", filters, servers, results)
}

/** @param {import("@ns").NS} ns */
export async function main(ns) {
  const SCAN_PROVIDE_HANDLER = ns.getPortHandle(PORT_IDS.SCAN_PROVIDE_HANDLER)
  const SCAN_REQUEST_HANDLER = ns.getPortHandle(PORT_IDS.SCAN_REQUEST_HANDLER)

  while(!SCAN_PROVIDE_HANDLER.tryWrite(
    JSON.stringify({
      action: "scan_init"
     ,payload: {}
    })
  )) {
    await ns.sleep(200)
  }

  while (true) {
    ns.print(`Awaiting Update to Act On`)
    while (SCAN_REQUEST_HANDLER.empty()) {
      await ns.sleep(200) // Check the PORT every 0.2 seconds
    }

    let request = JSON.parse(SCAN_REQUEST_HANDLER.read())
    ns.print(`Request recieved: ${JSON.stringify(request)}`)

    /**
     *  request = {
     *    action  = "scan_request"
     *   ,payload = {
     *      requester = <pid>
     *     ,filters   = {}
     *    }
     *  }
     */
    
    let result = scan_for_servers(ns, request.payload.filters)
    ns.print(`Result: ${result}`)

    let response = {
      action : "scan_response"
     ,payload: {
        requester: (request.payload.requester)
       ,result   : result
      }
    }

    while (!SCAN_PROVIDE_HANDLER.tryWrite(
      JSON.stringify(response)
    )) {
      await ns.sleep(4) // Try to write our response to the port every 0.004 seconds.
    }
    ns.print(`Response sent`)
  }
}