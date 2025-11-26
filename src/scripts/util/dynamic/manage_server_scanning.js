import { PORT_IDS } from "/src/scripts/util/dynamic/manage_ports"
const DEPTH_LIMIT = 50
const DEBUG = false

export class ScanFilter {
  /** @type {boolean} */
  is_rooted       = undefined;
  /** @type {boolean} */
  is_rootable     = undefined;
  /** @type {boolean} */
  is_hackable     = undefined;
  /** @type {boolean} */
  has_money       = undefined;
  /** @type {boolean} */
  has_ram         = undefined;
  /** @type {boolean} */
  include_home    = undefined;
  /** @type {boolean} */
  include_pserv   = undefined;
  /** @type {boolean} */
  include_hacknet = undefined;

  constructor() {}
}

export class ServerState {
  /** @type {string} */
  hostname
  /** @type {number} */
  curr_money
  /** @type {number} */
  max_money
  /** @type {number} */
  max_ram
  /** @type {number} */
  curr_diff
  /** @type {number} */
  min_diff
  /** @type {number} */
  num_ports_req
  /** @type {number} */
  hack_lvl_req
  /** @type {boolean} */
  is_rooted
  /** @type {number} */
  growth

  /**
   * @param {import("@ns").NS} ns 
   * @param {string} server 
   */
  constructor(ns, server) {
    let hacknet = server.includes("hacknet")
    let pserv = server.includes("pserv")
    this.hostname      = server
    this.curr_money    = (hacknet || pserv) ? 0 : ns.getServerMoneyAvailable(server)
    this.max_money     = (hacknet || pserv) ? 0 : ns.getServerMaxMoney(server)
    this.max_ram       = ns.getServerMaxRam(server)
    this.curr_diff     = (hacknet || pserv) ? 0 : ns.getServerSecurityLevel(server)
    this.min_diff      = (hacknet || pserv) ? 0 : ns.getServerMinSecurityLevel(server)
    this.num_ports_req = (hacknet || pserv) ? 0 : ns.getServerNumPortsRequired(server)
    this.hack_lvl_req  = (hacknet || pserv) ? 0 : ns.getServerRequiredHackingLevel(server)
    this.is_rooted     = ns.hasRootAccess(server)
    this.growth        = (hacknet || pserv) ? 0 : ns.getServerGrowth(server)
  }

  update(ns) {
    let hacknet = this.hostname.includes("hacknet")
    let pserv = this.hostname.includes("pserv")
    this.curr_money    = (hacknet || pserv) ? 0 : ns.getServerMoneyAvailable(this.hostname)
    this.max_money     = (hacknet || pserv) ? 0 : ns.getServerMaxMoney(this.hostname)
    this.max_ram       = ns.getServerMaxRam(this.hostname)
    this.curr_diff     = (hacknet || pserv) ? 0 : ns.getServerSecurityLevel(this.hostname)
    this.min_diff      = (hacknet || pserv) ? 0 : ns.getServerMinSecurityLevel(this.hostname)
    this.num_ports_req = (hacknet || pserv) ? 0 : ns.getServerNumPortsRequired(this.hostname)
    this.hack_lvl_req  = (hacknet || pserv) ? 0 : ns.getServerRequiredHackingLevel(this.hostname)
    this.is_rooted     = ns.hasRootAccess(this.hostname)
    this.growth        = (hacknet || pserv) ? 0 : ns.getServerGrowth(this.hostname)
  }
}

class ProcessInfo {
  /** @type {string} */
  most_recent_action
  /** @type {number} */
  last_ui_update
  /** @type {number} */
  last_server_update
  /** @type {number} */
  max_name_length
  /** @type {Object<string, ServerState>} */
  all_servers

  constructor() {
    this.all_servers = {}
    this.last_ui_update = 0
    this.last_server_update = 0
    this.max_name_length = 0
  }

  /**
   * @param {import("@ns").NS} ns 
   * @param {string} server 
   */
  add_server(ns, server) {
    this.all_servers[server] = new ServerState(ns, server)
  }

  update_server(ns, server) {
    if (this.all_servers[server] === undefined) {
      this.add_server(ns, server)
    }
    else {
      this.all_servers[server].update(ns)
    }
  }
}

/**
 * @param {import("@ns").NS} ns 
 * @param {ProcessInfo} process_info 
 */
function update_TUI(ns, process_info) {

  /** @type {string[]}*/
  let server_str = []
  let server_cnt = 0
  let max_length = 0
  let row = 0
  let ordered = Object.keys(process_info.all_servers).sort(
    function(a,b) {
      // Negative Result means a before b
      // Zero Result means no change
      // Positive Result means b before a
      return Math.sign(process_info.all_servers[b].max_money - process_info.all_servers[a].max_money)
    }
  )
  for (let server of ordered) {
    if (server.includes("hacknet") || server.includes("pserv") || server.includes("home")) {continue} // We don't need details of our own servers
    let info = process_info.all_servers[server]
    let money
    row = Math.floor(server_cnt/2)
    if (info.max_money != 0 ) {
      money = ` ${(`$`+ns.formatNumber(info.curr_money)).padStart(9)}`
      money = money + ` (${ns.formatPercent((info.curr_money / info.max_money)).padStart(7)}) ║`
    }
    else {money = `N/A ║`.padStart(22)}
    let str = `║ ${info.hostname.padEnd(process_info.max_name_length)} ║`
            + ` ${info.is_rooted ? "+" : "-"} ║`
            + money
            + `${ns.formatNumber(info.curr_diff,2).padStart(6)} /${ns.formatNumber(info.min_diff,2).padStart(6)} ║`
    server_str[row] = (server_str[row] || ``) + str
    max_length = Math.max(max_length, server_str[row].length)
    server_cnt += 1
  }

  let width_per_char = 9.7
  let height_for_title_bar = 33
  let height_per_line = 24
  let height = height_for_title_bar + (height_per_line * (row+1))
  let width  = width_per_char * max_length
  let tail = ns.self().tailProperties
  if (  tail
    &&  tail.height != height
    &&  tail.width  != width
  ) {
    ns.ui.resizeTail(width, height)
  }

  ns.clearLog()
  for (let string of server_str) {
    ns.print(string)
  }
}

/**
 * @param {import("@ns").NS} ns 
 * @param {ScanFilter} filter 
 * @returns {Promise<string[]>} A list of server names that match the given filter
 */
export async function request_scan(ns, filter = new ScanFilter(), debug = false) {
  const SCAN_REQUEST_HANDLER = ns.getPortHandle(PORT_IDS.SCAN_REQUEST_HANDLER)
  const SCAN_PROVIDE_HANDLER = ns.getPortHandle(PORT_IDS.SCAN_PROVIDE_HANDLER)
  let do_log = (DEBUG || debug)

  // ns.print(`Building Scan Request`)
  let request = {
    action : "scan_request"
   ,payload: {
      requester: ns.pid
     ,filters  : filter
     ,debug    : do_log
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

  // ns.print(`Sending Scan Request`)
  while (!SCAN_REQUEST_HANDLER.tryWrite(JSON.stringify(request))) {await ns.sleep(4)}
  
  let recieved_response = false
  let response
  // ns.print(`Awaiting`)
  while (!recieved_response) {
    while (SCAN_PROVIDE_HANDLER.empty()) {
      await ns.sleep(4)
    }
    response = JSON.parse(SCAN_PROVIDE_HANDLER.peek())
    if (
        response.action == "scan_response"
    &&  response.payload.requester == ns.pid
    ) {
      // ns.print(`Handling Response`)
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

  // ns.print(`Returning Response`)
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
function scan_for_servers_recur(ns, server, filters = {}, servers = [], results = [], debug = false, depth = 0, depth_limit = DEPTH_LIMIT) {
  let scan_results = ns.scan(server)

  let port_opener_cnt = 0
  if(ns.fileExists("BruteSSH.exe") ) {port_opener_cnt += 1}
  if(ns.fileExists("FTPCrack.exe") ) {port_opener_cnt += 1}
  if(ns.fileExists("relaySMTP.exe")) {port_opener_cnt += 1}
  if(ns.fileExists("HTTPWorm.exe") ) {port_opener_cnt += 1}
  if(ns.fileExists("SQLInject.exe")) {port_opener_cnt += 1}

  // Loop over the servers we can see.
  for (let scan_result of scan_results) {
    // Have we encountered this server before in our search?
    if (!servers.includes(scan_result)) {
      // Record that we've encountered this server while searching.
      servers.push(scan_result)

      // Do we want to include this server in the result set?
      let fail_filter_cnt = 0
      for (let filter in filters) {
        if (filters[filter] === undefined) {continue}
        if (debug) {
          ns.tprint(`INFO: Checking ${filter} on '${scan_result}'`)
        }
        switch (filter) {
          case "is_rooted":
            if (ns.hasRootAccess(scan_result) === filters[filter]) {
              continue
            }
            if (debug) {
              ns.tprint("Failed due to root")
            }
            fail_filter_cnt += 1
            break
          case "is_rootable":
            if ((ns.getServerNumPortsRequired(scan_result) <= port_opener_cnt) === filters[filter]) {
              continue
            }
            if (debug) {
              ns.tprint("Failed due to rootable")
            }
            fail_filter_cnt += 1
            break
          case "is_hackable":
            if ((ns.getServerRequiredHackingLevel(scan_result) < ns.getHackingLevel()) === filters[filter]) {
              continue
            }
            if (debug) {
              ns.tprint("Failed due to hackable")
            }
            fail_filter_cnt += 1
            break
          case "has_money":
            if ((ns.getServerMaxMoney(scan_result) > 0) === filters[filter]) {
              continue
            }
            if (debug) {
              ns.tprint("Failed due to money")
            }
            fail_filter_cnt += 1
            break
          case "has_ram":
            if ((ns.getServerMaxRam(scan_result) > 0) === filters[filter]) {
              continue
            }
            if (debug) {
              ns.tprint("Failed due to RAM")
            }
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
        scan_for_servers_recur(ns, scan_result, filters, servers, results, debug,  depth + 1, depth_limit)
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
 * @param {boolean} debug
 * @return {string[]}
 */
export function scan_for_servers(ns, filters, debug = false) {
  let servers = ["home"]
  let results = []

  // ns.tprint(`Filter:`)
  
  // for (let name in filters) {
  //   if (typeof filters[name] == typeof {}) {
  //     for (let name2 in filters[name]) {
  //       ns.tprint(`INFO: ${name}.${name2}: ${filters[name][name2]}`)
  //     }
  //   }
  //   else {
  //     ns.tprint(`INFO: ${name}: ${filters[name]}`)
  //   }
  // }

  let port_opener_cnt = 0
  if(ns.fileExists("BruteSSH.exe") ) {port_opener_cnt + 1}
  if(ns.fileExists("FTPCrack.exe") ) {port_opener_cnt + 1}
  if(ns.fileExists("relaySMTP.exe")) {port_opener_cnt + 1}
  if(ns.fileExists("HTTPWorm.exe") ) {port_opener_cnt + 1}
  if(ns.fileExists("SQLInject.exe")) {port_opener_cnt + 1}

  // Do we want to include "home" in the result set?
  let fail_filter_cnt = 0
  for (let filter in filters) {
    if (filters[filter] === undefined) {continue}
    if (debug) {
      ns.tprint(`INFO: Checking ${filter} on 'home'`)
    }
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

  return scan_for_servers_recur(ns, "home", filters, servers, results, debug)
}

/** @param {import("@ns").NS} ns */
export async function main(ns) {
  const SCAN_PROVIDE_HANDLER = ns.getPortHandle(PORT_IDS.SCAN_PROVIDE_HANDLER)
  const SCAN_REQUEST_HANDLER = ns.getPortHandle(PORT_IDS.SCAN_REQUEST_HANDLER)
  const SERVER_INFO_HANDLER  = ns.getPortHandle(PORT_IDS.SERVER_INFO_HANDLER)
  const arg_flags = ns.flags([
    ["parent_pid",""]
  ])
  ns.disableLog("ALL")
  ns.print(`Init Start...`)

  let process_info = new ProcessInfo()
  let filter = new ScanFilter()
  filter.include_home = true
  filter.include_hacknet = true
  filter.include_pserv = true
  let servers = scan_for_servers(ns, filter)
  for(let server of servers) {
    process_info.max_name_length = Math.max(process_info.max_name_length, server.length, 0)
    process_info.add_server(ns, server)
  }
  SERVER_INFO_HANDLER.clear()
  SERVER_INFO_HANDLER.write(JSON.stringify(process_info.all_servers))
  process_info.last_server_update = performance.now()

  ns.ui.setTailTitle("Sever Scan Manager V1.0 - PID: " + ns.pid)

  while(!SCAN_PROVIDE_HANDLER.tryWrite(
    JSON.stringify({
      action: "scan_init"
     ,payload: {
        requester: arg_flags.parent_pid
      }
    })
  )) {
    await ns.sleep(4)
  }
  ns.print(`Init Complete.`)

  while (true) {
    if ((process_info.last_ui_update + 1000) < performance.now()) {
      update_TUI(ns, process_info)
      process_info.last_ui_update = performance.now()
    }

    if ((process_info.last_server_update + 5000) < performance.now()) {
      servers = scan_for_servers(ns, filter)
      for (let server of servers) {
        process_info.max_name_length = Math.max(process_info.max_name_length, server.length, 0)
        process_info.update_server(ns, server)
      }
      SERVER_INFO_HANDLER.clear()
      SERVER_INFO_HANDLER.write(JSON.stringify(process_info.all_servers))
      process_info.last_server_update = performance.now()
      process_info.most_recent_action = `Update Server Info port`
    }

    while (SCAN_REQUEST_HANDLER.empty()) {
      if (!(SCAN_PROVIDE_HANDLER.empty())) {
        let next_response = JSON.parse(SCAN_PROVIDE_HANDLER.peek())
        if (!ns.isRunning(parseInt(next_response.payload.requester))) {
          SCAN_PROVIDE_HANDLER.read()
          process_info.most_recent_action = `Remvoing response to dead process from queue`
        }
      }
      process_info.most_recent_action = `Waiting for Scan Request`
      await ns.sleep(4) // Check the PORT every 0.05 seconds
    }

    process_info.most_recent_action = `Scan Request recieved`
    let request = JSON.parse(SCAN_REQUEST_HANDLER.read())

    /**
     *  request = {
     *    action  = "scan_request"
     *   ,payload = {
     *      requester = <pid>
     *     ,filters   = {}
     *    }
     *  }
     */
    
    let result = scan_for_servers(ns, request.payload.filters, request.payload.debug)

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
    process_info.most_recent_action = `Send Request Response`
  }
}