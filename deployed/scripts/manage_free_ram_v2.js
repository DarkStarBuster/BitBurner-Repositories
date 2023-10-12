import { scan_for_servers } from "/scripts/util/scan_for_servers"

const HACK_BATCH_LIMIT = 30
const HACK_BATCH_TIME_LIMIT = 2000
const TOTAL_HACK_BATCH_LIMIT = (6000 / 4) // <Total number of scripts we want running at any one time> / <4 as each hack batch runs 4 scripts>

const ZERO_PORT_SERVERS = [
  "n00dles",
  "foodnstuff",
  "sigma-cosmetics",
  "nectar-net",
  "joesguns",
  "hong-fang-tea",
  "harakiri-sushi"
]

const ONE_PORT_SERVERS = [
  //"CSEC", -- cannot hack this
  "neo-net",
  "max-hardware",
  "iron-gym",
  "zer0"
]

const TWO_PORT_SERVERS = [
  "crush-fitness",
  "phantasy",
  "silver-helix",
  "the-hub",
  "omega-net",
  "johnson-ortho"
  //"avmnite-02h" -- cannot hack this
]

const THREE_PORT_SERVERS = [
  "catalyst",
  "computek",
  "summit-uni",
  "rho-construction",
  //"I.I.I.I", -- cannot hack this
  "millenium-fitness",
  "netlink",
  "rothman-uni"
]

const FOUR_PORT_SERVERS = [
  "alpha-ent",
  "aevum-police",
  "univ-energy",
  "global-pharm",
  "nova-med",
  "applied-energetics",
  //".", -- cannot hack this
  //"run4theh111z", -- cannot hack this
  "zb-def",
  "snap-fitness",
  "unitalife",
  "lexo-corp",
  "syscore"
]

const FIVE_PORT_SERVERS = [
  "aerocorp",
  "galactic-cyber",
  "omnia",
  "defcomm",
  "infocomm",
  "deltaone",
  "icarus",
  "titan-labs",
  "fulcrumtech",
  "kuai-gong",
  "b-and-a",
  "nwo",
  "megacorp",
  "clarkinc",
  "powerhouse-fitness",
  "ecorp",
  "fulcrumassets",
  //"The-Cave", -- cannot hack this
  "stormtech",
  "solaris",
  "zeus-med",
  "taiyang-digital",
  "helios",
  "4sigma",
  "blade",
  "vitalife",
  "omnitek",
  "microdyne",
  "zb-institute"
]

async function is_server_busy(ns, server, ram_request_handler, ram_provide_handler) {
  let request = {
    "action"   : "free_ram_enquire"
   ,"server"   : server
   ,"requester": ns.pid
  }

  while (!ram_request_handler.tryWrite(JSON.stringify(request))) {
    await ns.sleep(50)
  }

  let awaiting_response = true
  let response = {}
  while (awaiting_response) {
    while(ram_provide_handler.empty()) {
      await ns.sleep(50)
    }
    response = JSON.parse(ram_provide_handler.peek())
    if (parseInt(response.requester) === ns.pid) {
      awaiting_response = false
      ram_provide_handler.read()
    }
    else {
      await ns.sleep(50)
    }
  }

  if (!(response.result === "OK")) {
    // Something went wrong with our request, log and return TRUE.
    ns.print("WARN Enquire Response for server " + server + " failed with reason: " + response.failure_reason)
    return Promise.resolve(true)
  }
  else {
    return Promise.resolve(!(response.max == response.free))
  }
}

async function request_ram(ns, server, ram_request_handler, ram_provide_handler) {
  let request = {
    "action"   : "free_ram_request"
   ,"server"   : server
   ,"requester": ns.pid
  }

  while (!ram_request_handler.tryWrite(JSON.stringify(request))) {
    await ns.sleep(50)
  }

  let awaiting_response = true
  let response = {}
  while (awaiting_response) {
    while(ram_provide_handler.empty()) {
      await ns.sleep(50)
    }
    response = JSON.parse(ram_provide_handler.peek())
    if (parseInt(response.requester) === ns.pid) {
      awaiting_response = false
      ram_provide_handler.read()
    }
    else {
      await ns.sleep(50)
    }
  }

  if (!(response.result === "OK")) {
    // Something went wrong with our request, log and return FALSE
    ns.print("WARN Request Response for server " + server + " failed with reason: " + response.failure_reason)
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
    await ns.sleep(50)
  }

  let awaiting_response = true
  let response = {}
  while (awaiting_response) {
    while(ram_provide_handler.empty()) {
      await ns.sleep(50)
    }
    response = JSON.parse(ram_provide_handler.peek())
    if (parseInt(response.requester) === ns.pid) {
      awaiting_response = false
      ram_provide_handler.read()
    }
    else {
      await ns.sleep(50)
    }
  }

  if (!(response.result === "OK")) {
    // Something went wrong with our request, log and return FALSE
    ns.print("WARN Release Response for server " + server + " failed with reason: " + response.failure_reason)
    return Promise.resolve(false)
  }
  else {
    return Promise.resolve(true)
  }
}

async function consume_ram(ns, p_servers, server_to_run, server_to_check, script_to_run, ram_request_handler, ram_provide_handler) {
  ns.print(
    "1: " + ns.getServerUsedRam(server_to_check) + "\n"
  + "2: " + ns.getServerMaxRam(server_to_check) * 0.9 + "\n"
  + "3: " + server_to_check
  )

  let server_busy = await is_server_busy(ns, server_to_check, ram_request_handler, ram_provide_handler)

  if (
      server_busy
  &&  ( (   !(server_to_check === "home")
          && p_servers[server_to_check].process_id === 0)
      ||(   server_to_check === "home")
      )
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
    ns.print(
      "4: " + p_servers[server_to_run].process_id + "\n"
    + "5: " + threads + "\n"
    + "6: " + p_servers[server_to_run].threads
    )
    if (
       p_servers[server_to_run].process_id === 0
    && threads > 0
    ) {
      ns.print("Option C1")
      let have_ram = await request_ram(ns, server_to_run, ram_request_handler, ram_provide_handler)
      if (have_ram) {
        let process_id = ns.exec(script_to_run, server_to_run, threads, "--target", "foodnstuff", "--threads", threads)
        p_servers[server_to_run].process_id = process_id
        p_servers[server_to_run].threads = threads
      }
    }
    else if (threads > p_servers[server_to_run].threads) {
      ns.print("Option C2")
      ns.kill(p_servers[server_to_run].process_id)
      p_servers[server_to_run].process_id = 0
      p_servers[server_to_run].threads = 0
      await release_ram(ns, server_to_run, ram_request_handler, ram_provide_handler)
      let have_ram = await request_ram(ns, server_to_run, ram_request_handler, ram_provide_handler)
      if (have_ram) {
        let process_id = ns.exec(script_to_run, server_to_run, threads, "--target", "foodnstuff", "--threads", threads)
        p_servers[server_to_run].process_id = process_id
        p_servers[server_to_run].threads = threads
      }
    }
  }
  return p_servers
}

/** @param {NS} ns */
export async function main(ns) {
  const CONTROL_PARAMETERS    = ns.getPortHandle(1)
  const BITNODE_MULTS_HANDLER = ns.getPortHandle(2)
  const SERVER_INFO_HANDLER   = ns.getPortHandle(3)
  const RAM_REQUEST_HANDLER   = ns.getPortHandle(5)
  const RAM_PROVIDE_HANDLER   = ns.getPortHandle(6)

  ns.disableLog("ALL")
  ns.enableLog("exec")
  ns.enableLog("kill")

  ns.setTitle("Manage Free RAM V2.0 - PID: " + ns.pid)
  
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
    let all_servers    = scan_for_servers(ns,{"is_rooted":true,"has_money":true})

    for (let server of ns.getPurchasedServers()){
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
          server_to_check = "pserv-" + (parseInt(server.split("-")[1]) - 1)
          filename = "/scripts/util/weaken_for_exp.js"
          break
      }

      await consume_ram(ns, p_servers, server, server_to_check, filename, RAM_REQUEST_HANDLER, RAM_PROVIDE_HANDLER)
    }
    await ns.sleep(10)
  }

}