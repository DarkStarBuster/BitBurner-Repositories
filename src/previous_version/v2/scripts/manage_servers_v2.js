import { scan_for_servers } from "/scripts/util/scan_for_servers"

const HACK_BATCH_LIMIT = 30
const HACK_BATCH_TIME_LIMIT = 2000
const TOTAL_HACK_BATCH_LIMIT = (6000 / 4) // <Total number of scripts we want running at any one time> / <4 as each hack batch runs 4 scripts>

/** @param {NS} ns */
function disable_logging(ns){
  ns.disableLog("sleep")
  ns.disableLog("scan")
  ns.disableLog("getServerNumPortsRequired")
  ns.disableLog("getServerSecurityLevel")
  ns.disableLog("getServerMinSecurityLevel")
  ns.disableLog("getServerMaxMoney")
  ns.disableLog("getServerMoneyAvailable")
  ns.disableLog("getHackingLevel")
  ns.disableLog("getServerRequiredHackingLevel")
  ns.disableLog("brutessh")
  ns.disableLog("ftpcrack")
  ns.disableLog("relaysmtp")
  ns.disableLog("httpworm")
  ns.disableLog("sqlinject")
  ns.disableLog("nuke")
}

/** 
 * @param {NS} ns
 * @param {boolean} force_update
 */
async function check_root(ns, force_update) {
  const UPDATE_HANDLER = ns.getPortHandle(4)

  let hack_dictionary = {
    "brute": ns.fileExists("BruteSSH.exe"),
    "ftp": ns.fileExists("FTPCrack.exe"),
    "smtp": ns.fileExists("relaySMTP.exe"),
    "http": ns.fileExists("HTTPWorm.exe"),
    "sql": ns.fileExists("SQLInject.exe"),
  }

  let unrooted_servers = scan_for_servers(ns, (!force_update ? {"is_rooted":false} : {"include_home":true}))

  for (let server of unrooted_servers) {
    if (ns.getServerRequiredHackingLevel(server) <= ns.getHackingLevel()) {
      //ns.print(server + " has a hacking level below current skill.")
      let ports_opened = 0
      for (var hack_type in hack_dictionary){
        if(hack_dictionary[hack_type]){
          ports_opened += 1
          switch (hack_type){
            case "brute":
              ns.brutessh(server)
              break
            case "ftp":
              ns.ftpcrack(server)
              break
            case "smtp":
              ns.relaysmtp(server)
              break
            case "http":
              ns.httpworm(server)
              break
            case "sql":
              ns.sqlinject(server)
              break
          }
        }
      }
      if (ns.getServerNumPortsRequired(server) > ports_opened) {
        ns.print(server + " requires " + ns.getServerNumPortsRequired(server) + " ports opened to nuke, we opened " + ports_opened)
      }
      let newly_rooted = false
      if (ns.getServerNumPortsRequired(server) <= ports_opened && !ns.hasRootAccess(server)) {
        ns.nuke(server)
        newly_rooted = true
      }
      if (ns.hasRootAccess(server)) {
        if (newly_rooted) {
          ns.print(server + " successfully rooted")
          ns.toast("Successfully Rooted \"" + server + "\"", "success", 5000)
        }

        if (!ns.fileExists("/scripts/weaken.js",server)) ns.scp("/scripts/weaken.js", server)
        if (!ns.fileExists("/scripts/grow.js",server))   ns.scp("/scripts/grow.js", server)
        if (!ns.fileExists("/scripts/hack.js",server))   ns.scp("/scripts/hack.js", server)

        if (server.includes("pserv")) {
          if (!ns.fileExists("/scripts/share.js",server))  ns.scp("/scripts/share.js", server)
          if (!ns.fileExists("/scripts/manage_server_hack.js",server)) ns.scp("/scripts/manage_server_hack.js", server)
          if (!ns.fileExists("/scripts/manage_server_prep.js",server)) ns.scp("/scripts/manage_server_prep.js", server)
          if (!ns.fileExists("/scripts/solve_cct.js")) ns.scp("/scripts/solve_cct.js", server)
        }

        let update = {
          "action": "update_info",
          "update_info": {
            "server": server
          }
        }
        
        while(UPDATE_HANDLER.full()) {
          await ns.sleep(200)
        }
        UPDATE_HANDLER.write(JSON.stringify(update))
      }
    }
  }
  ns.print("Finished Rooting New Servers")
  return Promise.resolve()
}


/**
 *  @param {NS} ns
 *  @param {string} target
 */
function request_prepper(ns, target) {
  const UPDATE_HANDLER = ns.getPortHandle(4)

  let update = {
    "action": "request_action",
    "request_action": {
      "script_action": "preserv",
      "target": target,
      "threads": 1
    }
  }
  
  UPDATE_HANDLER.write(JSON.stringify(update))
}


/**
 *  @param {NS} ns
 *  @param {string} target
 */
function request_manager(ns, target) {
  const UPDATE_HANDLER = ns.getPortHandle(4)

  let update = {
    "action": "request_action",
    "request_action": {
      "script_action": "manage",
      "target": target,
      "threads": 1
    }
  }
  
  UPDATE_HANDLER.write(JSON.stringify(update))
}

/** @param {NS} ns */
async function check_manage(ns) {
  const BITNODE_MULTS_HANDLER = ns.getPortHandle(2)
  const SERVER_INFO_HANDLER = ns.getPortHandle(3)
  const UPDATE_HANDLER = ns.getPortHandle(4)

  let all_server_info = JSON.parse(SERVER_INFO_HANDLER.peek())
  let bitnode_info = JSON.parse(BITNODE_MULTS_HANDLER.peek())

  let managed_servers = []
  let managed_servers_w_pid = {}
  let preserv_servers = []

  for (let server in all_server_info) {
    for (let process_id in all_server_info[server].actions) {
      if (
          all_server_info[server].actions[process_id].action == "manage"
      &&  managed_servers.indexOf(all_server_info[server].actions[process_id].target) < 0
      ) {
        ns.print(all_server_info[server].actions[process_id].target + " added to managed server list with pid: " + process_id)
        managed_servers.push(all_server_info[server].actions[process_id].target)
        managed_servers_w_pid[all_server_info[server].actions[process_id].target] = {
          "pid": process_id,
          "server": server
        }
      }
      if (
          all_server_info[server].actions[process_id].action == "preserv"
      &&  preserv_servers.indexOf(all_server_info[server].actions[process_id].target) < 0
      ) {
        ns.print(all_server_info[server].actions[process_id].target + " added to preserv server list")
        preserv_servers.push(all_server_info[server].actions[process_id].target)
      }
    }
  }

  ns.print(managed_servers.length + " Managed Server processes found")
  ns.print(preserv_servers.length + " Prepare Server processes found")

  let servers = scan_for_servers(ns,{"is_rooted":true,"has_money":true})
  //let servers = scan_server(ns, "home", ["home"], [], 0, 50)
  if (
      // We are "early game"
      ns.getServerMaxRam("home") < 64
      // We need to only hit "optimal" targets
  ||  (   bitnode_info["ScriptHackMoney"] < 0.5
      &&  ns.getServerMaxRam("home") < 512
      )
  ) {
    servers = [
      "n00dles",
      "joesguns",
      "iron-gym",
      "phantasy"
       //TODO: Add optimal targets for 3_port, 4_port and 5_port servers
    ]
  }

  servers.sort(
    function(a,b){
      let player = ns.getPlayer()
      let server_a = ns.getServer(a)
      let server_b = ns.getServer(b)
      server_a.hackDifficulty = server_a.minDifficulty
      server_a.moneyAvailable = server_a.moneyMax
      server_b.hackDifficulty = server_b.minDifficulty
      server_b.moneyAvailable = server_b.moneyMax

      let server_a_hack_percent = ns.formulas.hacking.hackPercent(server_a, player)
      let server_a_hack_chance  = ns.formulas.hacking.hackChance (server_a, player)
      let server_a_weaken_time  = ns.formulas.hacking.weakenTime (server_a, player)
      let server_b_hack_percent = ns.formulas.hacking.hackPercent(server_b, player)
      let server_b_hack_chance  = ns.formulas.hacking.hackChance (server_b, player)
      let server_b_weaken_time  = ns.formulas.hacking.weakenTime (server_b, player)

      return (server_b_hack_percent * server_b_hack_chance * server_b.moneyMax)
      - (server_a_hack_percent * server_a_hack_chance * server_a.moneyMax)
    }
  )

  // TODO: Narrow down prep managers to only prep the single most profitable un-preped server at a time.

  let hackable_servers = []
  let prep_servers = []

  for (let server of servers) {
    if (
      (
          ns.getServerSecurityLevel(server) != ns.getServerMinSecurityLevel(server)
      ||  ns.getServerMoneyAvailable(server) != ns.getServerMaxMoney(server)
      )
    &&  managed_servers.indexOf(server) == -1
    ) {
      prep_servers.push(server)
      continue
    }
    else if (
      preserv_servers.indexOf(server) != -1
    ) {
      continue
    }
    hackable_servers.push(server)
  }

  let servers_to_hack = []
  let hack_batches_needed = 0

  for (let server of hackable_servers){
    let server_batches_needed = Math.max(Math.floor(ns.getWeakenTime(server) / HACK_BATCH_TIME_LIMIT),1)
    if (hack_batches_needed + server_batches_needed < TOTAL_HACK_BATCH_LIMIT) {
      ns.print("Added " + server + " with " + server_batches_needed + " to the list of servers")
      hack_batches_needed += server_batches_needed
      servers_to_hack.push(server)
    }
    // else {
    //   // Adding another server will cause us to go over the limit we have set ourselves.
    //   ns.print("Total of " + hack_batches_needed + " hack batches are expected to be spawned")
    //   break
    // }
  }
  ns.print("Total of " + hack_batches_needed + " hack batches are expected to be spawned")

  for (let server of managed_servers) {
    // Managing server currently but it is not in the servers to hack, kill the manager process
    if (servers_to_hack.indexOf(server) == -1) {
      ns.print("Killing manager for " + server + " as we no longer want to hack it.")
      ns.kill(parseInt(managed_servers_w_pid[server].pid))
      
      let update_message = {
        "action": "update_info",
        "update_info": {
          "server": managed_servers_w_pid[server].server,
          "freed_ram": 5.75 * 1,
          "pid_to_remove": parseInt(managed_servers_w_pid[server])
        }
      }

      while(UPDATE_HANDLER.full()) {
        await ns.sleep(1000 + ((ns.pid * 10) % 1000))
      }
      while (!UPDATE_HANDLER.tryWrite(JSON.stringify(update_message))){
        await ns.sleep(1000 + ((ns.pid * 10) % 1000))
      }
    }
  }

  for (let server of servers_to_hack) {
    // Not managing currently, request new manager
    if (managed_servers.indexOf(server) == -1) {
      ns.print("Enquing manager for " + server + ".")
      request_manager(ns, server)
    }
  }

  for (let server of prep_servers) {
    // Not preping currently, request new prepper
    if (preserv_servers.length == 0) {
      ns.print("Enquing prepper for " + server + ".")
      request_prepper(ns, server)
      break
    }
  }

  ns.print("Finished requesting new manager processes")
}

/** @param {NS} ns */
export async function main(ns) {
  // Disable logging of things in this script
  disable_logging(ns)

  // Sleep for a second before starting the loop
  await ns.sleep(1000)

  let loop_count = 0

  while (true) {

    if (loop_count >= 120) {
      loop_count = 0
    }

    // Every ten minutes
    let force_update = false
    if ((loop_count % 60) == 0) {
      force_update = true
    }

    // Every two minutes
    if ((loop_count % 12) == 0) {
      // Root New Servers
      ns.print("Root New Servers")
      await check_root(ns, force_update)
    }

    // Every two minutes (offset by one minute)
    if (((loop_count + 6) % 12) == 0) {
      // Create new instances of 'scripts/manage_server.js'
      ns.print("Request New Manage Server processes")
      await check_manage(ns)
    }

    // Sleep for a second before restarting the program loop
    await ns.sleep(1000)
    loop_count += 1
  }
}