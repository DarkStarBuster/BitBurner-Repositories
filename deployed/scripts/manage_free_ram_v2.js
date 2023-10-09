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

/** @param {NS} ns */
export async function main(ns) {
  const SERVER_INFO_HANDLER = ns.getPortHandle(3)
  const UPDATE_HANDLER = ns.getPortHandle(4)

  ns.disableLog("scan")
  ns.disableLog("getServerMaxRam")
  ns.disableLog("getServerMaxMoney")
  ns.disableLog("getServerUsedRam")
  ns.disableLog("getServerNumPortsRequired")
  ns.disableLog("exec")
  
  // Possibly at game start? Either wait to be killed, or listen for the write that follows the execution of this process.
  if (SERVER_INFO_HANDLER.empty()) {
    ns.print("Awaiting next Server Info Handler write")
    await SERVER_INFO_HANDLER.nextWrite()
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
    for (let server of ns.getPurchasedServers()){
      if (!p_servers_array.includes(server)) {
        p_servers[server] = {
          "server_ram": ns.getServerMaxRam(server),
          "process_id": 0,
          "threads": 0
        }
        p_servers_array.push(server)
      }
      else if (
        p_servers[server].process_id == 0
      ) {
        p_servers[server].server_ram = ns.getServerMaxRam(server)
        p_servers[server].threads = 0
      }
    }
    let server_info = JSON.parse(SERVER_INFO_HANDLER.peek())
    let hacking_servers = []
    let hackable_servers = []
    let all_servers = scan_for_servers(ns,{"is_rooted":true,"has_money":true})

    let preserv_servers = []

    for (let server in server_info) {
      for (let process_id in server_info[server].actions) {
        if (
            server_info[server].actions[process_id].action == "preserv"
        &&  preserv_servers.indexOf(server_info[server].actions[process_id].target) < 0
        ) {
          //ns.print(all_server_info[server].actions[process_id].target + " added to preserv server list")
          preserv_servers.push(server_info[server].actions[process_id].target)
        }
      }
    }

    for (let server of all_servers) {
      if (preserv_servers.includes(server)) {
        continue
      }
      hackable_servers.push(server)
    }

    hackable_servers.sort(
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

    let servers_to_ignore = []
    let servers_to_hack = []
    let hack_batches_needed = 0

    for (let server of hackable_servers){
      let server_batches_needed = Math.floor(ns.getWeakenTime(server) / HACK_BATCH_TIME_LIMIT)
      if (server_batches_needed < 1) {
        servers_to_ignore.push(server)
        ns.print("Added " + server + " to the ignore list as we're too fast hacking it")
        continue
      }
      server_batches_needed = Math.max(server_batches_needed,1)
      if (hack_batches_needed + server_batches_needed < TOTAL_HACK_BATCH_LIMIT) {
        ns.print("Added " + server + " with " + server_batches_needed + " to the list of servers we expect to be hacking")
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


    //ns.print("Rooted Servers:")
    //ns.print(rooted_servers)

    for (let server in server_info) {
      //ns.print("Looking at server: " + server)
      for (let action in server_info[server].actions) {
        //ns.print("Looking at server: " + server + ":" + action + " which is " + server_info[server].actions[action].action)
        if (
          (   
              server_info[server].actions[action].action == "hack"
          ||  server_info[server].actions[action].action == "weaken"
          ||  server_info[server].actions[action].action == "grow"
          )
        &&  hacking_servers.indexOf(server_info[server].actions[action].target) == -1
        &&  preserv_servers.indexOf(server_info[server].actions[action].target) == -1
        //&&  servers_to_ignore.indexOf(server_info[server].actions[action].target) == -1
        ) {
          hacking_servers.push(server_info[server].actions[action].target)
        }
      }
    }

    let missed_server = false
    // Compare lengths
    if (servers_to_hack.length != hacking_servers.length) {
      for (let server of servers_to_hack) {
        if (hacking_servers.indexOf(server) == -1) {
          ns.print("Missing hack threads on " + server)
          missed_server = true
        }
      }
    }
    //await ns.sleep(60000)
    ns.print("Servers to Hack length: " + servers_to_hack.length + ". Hacking Servers length: " + hacking_servers.length + ". Missed Server: " + missed_server)

    // We are hacking every server we have rooted, RAM is free for additional EXP / Share threads
    if (
        servers_to_hack.length == hacking_servers.length
    ||  (
            servers_to_hack.length < hacking_servers.length
        &&  !missed_server
        ) 
    ) {
      ns.print("Consider servers to launch free ram users on")
      for (let server in p_servers) {
        let filename = "/scripts/weaken_for_exp.js"
        if (server == "pserv-24") {
          filename = "/scripts/share.js"
        }
        if (
            p_servers[server].process_id == 0
        &&  ns.ps(server).length == 0
        &&  (   (   server == "pserv-0"
                &&  (ns.getServerMaxRam("home") - ns.getServerUsedRam("home")) > 32
                )
            ||  server != "pserv-0"
            )
        ) {
          ns.print("Server " + server + " is free to use for " + filename + ".")
          let threads = Math.floor((p_servers[server].server_ram - ns.getServerUsedRam(server)) / ns.getScriptRam(filename))
          if (!ns.fileExists(filename,server))  ns.scp(filename, server)
          // let process_id = ns.exec(filename,server,threads,"--target","foodnstuff","--threads",threads)

          // if (process_id != 0) {
          //   ns.print("Executed " + filename + " script on " + server + " using " + ns.formatRam(threads*ns.getScriptRam(filename)) + " RAM")
          //   let update_1 = {
          //     "action": "request_action",
          //     "request_action": {
          //       "action": "weakexp",
          //       "target": server,
          //       "server": server,
          //       "pid_to_use": process_id,
          //       "ram_used": threads * ns.getScriptRam(filename),
          //       "threads": threads
          //     }
          //   }

          //   p_servers[server].process_id = process_id
          //   p_servers[server].threads = threads
          //   while (UPDATE_HANDLER.full()) {
          //     await ns.sleep(1000 + ((ns.pid * 10) % 1000))
          //   }
          //   while (!UPDATE_HANDLER.tryWrite(JSON.stringify(update_1))){
          //     await ns.sleep(1000 + ((ns.pid * 10) % 1000))
          //   }
          // }
        }
        else if (
            p_servers[server].process_id != 0
        &&  p_servers[server].server_ram != ns.getServerMaxRam(server)
        ) {
          // Server has a weaken_for_exp process but has grown
          ns.print("Kill current " + filename + " script since the server has grown")
          p_servers[server].server_ram = ns.getServerMaxRam(server)
          ns.kill(p_servers[server].process_id)
          // let update_2 = {
          //   "action": "update_info",
          //   "update_info": {
          //     "server": server,
          //     "freed_ram": ns.getScriptRam(filename) * p_servers[server].threads,
          //     "pid_to_remove": p_servers[server].process_id
          //   }
          // }
          // while (UPDATE_HANDLER.full()) {
          //   await ns.sleep(1000 + ((ns.pid * 10) % 1000))
          // }
          // while (!UPDATE_HANDLER.tryWrite(JSON.stringify(update_2))){
          //   await ns.sleep(1000 + ((ns.pid * 10) % 1000))
          // }
          p_servers[server].process_id = 0
          p_servers[server].threads = 0
        }
        else if (
            server == "pserv-0"
        &&  (ns.getServerMaxRam("home") - ns.getServerUsedRam("home")) < 32
        ) {
          if (p_servers[server].process_id != 0) {
            ns.print("Kill current " + filename + " on " + server + " as we have little space on home")
            ns.kill(p_servers[server].process_id)
            // let update_2 = {
            //   "action": "update_info",
            //   "update_info": {
            //     "server": server,
            //     "freed_ram": ns.getScriptRam(filename) * p_servers[server].threads,
            //     "pid_to_remove": p_servers[server].process_id
            //   }
            // }
            // while (UPDATE_HANDLER.full()) {
            //   await ns.sleep(1000 + ((ns.pid * 10) % 1000))
            // }
            // while (!UPDATE_HANDLER.tryWrite(JSON.stringify(update_2))){
            //   await ns.sleep(1000 + ((ns.pid * 10) % 1000))
            // }
            p_servers[server].process_id = 0
            p_servers[server].threads = 0
          }
        }
      }
    }
    // We are not hacking every server we have rooted, free up all RAM to allow for other processes
    else {
      ns.print("Time to kill all scripts")
      for (let server in p_servers) {
        let filename = "/scripts/weaken_for_exp.js"
        if (server == "pserv-24") {
          filename = "/scripts/share.js"
        }
        if (p_servers[server].process_id != 0) {
          ns.kill(p_servers[server].process_id)

          // let update_3 = {
          //   "action": "update_info",
          //   "update_info": {
          //     "server": server,
          //     "freed_ram": ns.getScriptRam(filename) * p_servers[server].threads,
          //     "pid_to_remove": p_servers[server].process_id
          //   }
          // }
          // while (UPDATE_HANDLER.full()) {
          //   await ns.sleep(1000 + ((ns.pid * 10) % 1000))
          // }
          // while (!UPDATE_HANDLER.tryWrite(JSON.stringify(update_3))){
          //   await ns.sleep(1000 + ((ns.pid * 10) % 1000))
          // }
          p_servers[server].process_id = 0
          p_servers[server].threads = 0
        }
      }
    }

    await ns.sleep(10000)
  }

}