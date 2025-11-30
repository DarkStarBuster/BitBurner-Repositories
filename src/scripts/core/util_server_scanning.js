import { PORT_IDS } from "/src/scripts/boot/manage_ports"

const DEBUG = false;

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
  include_hashnet = undefined;

  constructor() {}
}

export class ServerStateInfo {
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

  constructor() {}
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