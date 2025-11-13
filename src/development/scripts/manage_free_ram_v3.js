import { scan_for_servers } from "/scripts/util/scan_for_servers"
import { PORT_IDS } from "/scripts/util/port_management"
import { COLOUR, colourize } from "/scripts/util/colours"

async function is_server_busy(ns, server, ram_request_handler, ram_provide_handler) {
  let request = {
    "action"   : "free_ram_enquire"
   ,"server"   : server
   ,"requester": ns.pid
  }

  while (!ram_request_handler.tryWrite(JSON.stringify(request))) {
    await ns.sleep(4)
  }

  let awaiting_response = true
  let response = {}
  while (awaiting_response) {
    while(ram_provide_handler.empty()) {
      await ns.sleep(4)
    }
    response = JSON.parse(ram_provide_handler.peek())
    if (parseInt(response.requester) === ns.pid) {
      awaiting_response = false
      ram_provide_handler.read()
    }
    else {
      await ns.sleep(4)
    }
  }
  
  if (!(response.result === "OK")) {
    // Something went wrong with our request, log and return TRUE.
    return Promise.resolve(true)
  }
  else {
    let is_busy = true
    if (
        server === "home"
    &&  response.free > (response.max * 0.1)
    ) {
      is_busy = false
    }
    else {
      is_busy = !(response.max == response.free)
    }
    //if (server === "home") await ns.sleep(10000) 
    return Promise.resolve(is_busy)
  }
}

async function is_pid_on_server(ns, server, ram_request_handler, ram_provide_handler) {
  let request = {
    "action"   : "pid_on_server_enquire"
   ,"server"   : server
   ,"requester": ns.pid
  }

  while (!ram_request_handler.tryWrite(JSON.stringify(request))) {
    await ns.sleep(4)
  }
  
  let awaiting_response = true
  let response = {}
  while (awaiting_response) {
    while(ram_provide_handler.empty()) {
      await ns.sleep(4)
    }
    response = JSON.parse(ram_provide_handler.peek())
    if (parseInt(response.requester) === ns.pid) {
      awaiting_response = false
      ram_provide_handler.read()
    }
    else {
      await ns.sleep(4)
    }
  }

  if (!(response.result === "OK")) {
    // Something went wrong with our request, log and return TRUE.
    return Promise.resolve(true)
  }
  else {
    return Promise.resolve(response.present)
  }
}

async function request_ram(ns, server, ram, ram_request_handler, ram_provide_handler) {
  let request = {
    "action"   : "free_ram_request"
   ,"server"   : server
   ,"amount"   : ram
   ,"requester": ns.pid
  }

  while (!ram_request_handler.tryWrite(JSON.stringify(request))) {
    await ns.sleep(4)
  }
  
  let awaiting_response = true
  let response = {}
  while (awaiting_response) {
    while(ram_provide_handler.empty()) {
      await ns.sleep(4)
    }
    response = JSON.parse(ram_provide_handler.peek())
    if (parseInt(response.requester) === ns.pid) {
      awaiting_response = false
      ram_provide_handler.read()
    }
    else {
      await ns.sleep(4)
    }
  }

  if (!(response.result === "OK")) {
    // Something went wrong with our request, log and return FALSE
    return Promise.resolve(false)
  }
  else {
    return Promise.resolve(true)
  }
}

async function release_ram(ns, server, ram_request_handler, ram_provide_handler) {
  let request = {
    "action"   : "free_ram_release"
   ,"server"   : server
   ,"requester": ns.pid
  }

  while (!ram_request_handler.tryWrite(JSON.stringify(request))) {
    await ns.sleep(4)
  }

  let awaiting_response = true
  let response = {}
  while (awaiting_response) {
    while(ram_provide_handler.empty()) {
      await ns.sleep(4)
    }
    response = JSON.parse(ram_provide_handler.peek())
    if (parseInt(response.requester) === ns.pid) {
      awaiting_response = false
      ram_provide_handler.read()
    }
    else {
      await ns.sleep(4)
    }
  }

  if (!(response.result === "OK")) {
    // Something went wrong with our request, log and return FALSE
    return Promise.resolve(false)
  }
  else {
    ns.print(LOG_COLOUR + "RAM: Response has freed our RAM")
    return Promise.resolve(true)
  }
}

/**
 * 
 * @param {import("../../.").NS} ns 
 * @param {*} p_servers 
 * @param {*} server_to_run 
 * @param {*} server_to_check 
 * @param {*} script_to_run 
 * @param {*} ram_request_handler 
 * @param {*} ram_provide_handler 
 * @returns 
 */
async function consume_ram(ns, p_servers, server_to_run, server_to_check, script_to_run, ram_request_handler, ram_provide_handler) {
  if (p_servers[server_to_run].process_id === 0) {
    let ram_check = await is_pid_on_server(ns, server_to_run, ram_request_handler, ram_provide_handler)
    if (ram_check) {
      await release_ram(ns, server_to_run, ram_request_handler, ram_provide_handler)
    }
  }

  let server_busy = await is_server_busy(ns, server_to_check, ram_request_handler, ram_provide_handler)

  if (
      server_busy
  &&  (   p_servers[server_to_check].process_id === 0
      ||  server_to_run === "home")
  ) {
    if(!(p_servers[server_to_run].process_id === 0)) {
      ns.kill(p_servers[server_to_run].process_id)
      p_servers[server_to_run].process_id = 0
      p_servers[server_to_run].threads = 0
      await release_ram(ns, server_to_run, ram_request_handler, ram_provide_handler)
    }
  }
  else {
    // server_to_check is not Busy
    let threads = Math.floor(p_servers[server_to_run].server_ram / ns.getScriptRam(script_to_run))
    if (server_to_run === "home") {
      threads = Math.floor(((ns.getServerMaxRam("home") - ns.getServerUsedRam("home")) * 0.7) / ns.getScriptRam(script_to_run))
    }
    if (
       p_servers[server_to_run].process_id === 0
    && threads > 0
    ) {
      let have_ram = await request_ram(ns, server_to_run, threads * ns.getScriptRam(script_to_run), ram_request_handler, ram_provide_handler)
      if (have_ram) {
        let process_id = ns.exec(script_to_run, server_to_run, threads, "--target", "foodnstuff", "--threads", threads)
        p_servers[server_to_run].process_id = process_id
        p_servers[server_to_run].threads = threads
      }
    }
    else if (threads > p_servers[server_to_run].threads) {
      ns.kill(p_servers[server_to_run].process_id)
      p_servers[server_to_run].process_id = 0
      p_servers[server_to_run].threads = 0
      await release_ram(ns, server_to_run, ram_request_handler, ram_provide_handler)
      let have_ram = await request_ram(ns, server_to_run, threads * ns.getScriptRam(script_to_run), ram_request_handler, ram_provide_handler)
      if (have_ram) {
        let process_id = ns.exec(script_to_run, server_to_run, threads, "--target", "foodnstuff", "--threads", threads)
        p_servers[server_to_run].process_id = process_id
        p_servers[server_to_run].threads = threads
      }
    }
  }
  return p_servers
}

/** @param {import("../../.").NS} ns */
export async function main(ns) {
  const CONTROL_PARAMETERS    = ns.getPortHandle(PORT_IDS.CONTROL_PARAM_HANDLER)
  const BITNODE_MULTS_HANDLER = ns.getPortHandle(PORT_IDS.BITNODE_MULTS_HANDLER)
  const SERVER_INFO_HANDLER   = ns.getPortHandle(PORT_IDS.SERVER_INFO_HANDLER)
  const RAM_REQUEST_HANDLER   = ns.getPortHandle(PORT_IDS.RAM_REQUEST_HANDLER)
  const RAM_PROVIDE_HANDLER   = ns.getPortHandle(PORT_IDS.RAM_PROVIDE_HANDLER)

  ns.disableLog("ALL")
  ns.enableLog("exec")
  ns.enableLog("kill")

  ns.ui.setTailTitle("Manage Free RAM V3.0 - PID: " + ns.pid)
  
  while (
      CONTROL_PARAMETERS.empty()
  ||  BITNODE_MULTS_HANDLER.empty()
  ||  SERVER_INFO_HANDLER.empty()
  ) {
    await ns.sleep(50)
  }

  let p_servers_array = []
  let p_servers = {}
  for (let server of ns.getPurchasedServers()){
    p_servers_array.push(server)
    p_servers[server] = {
      "server_ram": ns.getServerMaxRam(server),
      "process_id": 0,
      "threads": 0
    }
  }

  while(true) {
    let control_params = JSON.parse(CONTROL_PARAMETERS.peek())
    let server_info    = JSON.parse(SERVER_INFO_HANDLER.peek())
    let all_servers = scan_for_servers(ns,{"is_rooted":true,"has_ram":true,"include_pserv":true,"include_hacknet":false})
    //all_servers = ["home"]
    //ns.print(all_servers)
    for (let server of all_servers){
      ns.print("Check server " + server)
      if (!p_servers_array.includes(server)) {
        p_servers[server] = {
          "server_ram": ns.getServerMaxRam(server),
          "process_id": 0,
          "threads": 0
        }
        p_servers_array.push(server)
      }
      else {
        p_servers[server].server_ram = ns.getServerMaxRam(server)
      }

      let server_to_check
      let filename
      switch (server) {
        case "pserv-0":
          server_to_check = "home"
          filename = "/scripts/util/weaken_for_exp.js"
          break
        case "pserv-24":
          server_to_check = "pserv-23"
          filename = "/scripts/util/share.js"
          break
        default:
          if (server.includes("pserv")) {
            server_to_check = "pserv-" + (parseInt(server.split("-")[1]) - 1)
          }
          else {
            server_to_check = "home"
          }
          filename = "/scripts/util/weaken_for_exp.js"
          break
      }

      if (ns.hasRootAccess(server) && ns.hasRootAccess("foodnstuff")) await consume_ram(ns, p_servers, server, server_to_check, filename, RAM_REQUEST_HANDLER, RAM_PROVIDE_HANDLER)
    }

    await ns.sleep(4)
  }

}