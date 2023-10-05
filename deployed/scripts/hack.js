/** Designed to work with scripts/control_servers_v2 */

/** @param {NS} ns */
export async function main(ns) {
  const arg_flags = ns.flags([
    ["server",""],
    ["target",""],
    ["addMsec",0],
    ["threads",0]
  ])
  const SERVER_INFO_HANDLER = ns.getPortHandle(3)
  const UPDATE_HANDLER = ns.getPortHandle(4)

  let do_hack = true
  let all_server_info_string = ""

  if (arg_flags.server == "") {
    ns.toast("Called hack.js without server ident","warning")
    do_hack = false
  }
  if (arg_flags.target == "") {
    ns.toast("Called hack.js without target","warning")
    ns.tprint("Target empty?")
    do_hack = false
  }
  if (arg_flags.addMsec < 0) {
    ns.toast("Called hack.js with negative addMsec","warning")
    do_hack = false
  }
  if (arg_flags.threads <= 0) {
    ns.toast("Called hack.js with zero or negative threads","warning")
    do_hack = false
  }
  
  // // Add delay to try and stagger Port Writing
  // await ns.sleep(1000 + ((ns.pid * 10) % 1000))

  all_server_info_string = SERVER_INFO_HANDLER.peek()
  while (all_server_info_string === "NULL PORT DATA"){
      ns.print("Awaiting Next Update")
      await SERVER_INFO_HANDLER.nextWrite()
      all_server_info_string = SERVER_INFO_HANDLER.peek()
      await ns.sleep(100)
      ns.print("Await ended")
  }

  let all_server_info = JSON.parse(all_server_info_string)
  let target_info = all_server_info[arg_flags.target]
  let server_info = all_server_info[arg_flags.server]
  
  if (do_hack) {
    ns.print("Performing Hack")
    let earned_money = await ns.hack(arg_flags.target,{additionalMsec:arg_flags.addMsec,threads:arg_flags.threads})


    let update_message_1 = {
      "action": "update_info",
      "update_info": {
        "server": arg_flags.target,
        "earned_money": earned_money,
        "diff_increased_by": (0.02 * arg_flags.threads)
      }
    }

    let update_message_2 = {
      "action": "update_info",
      "update_info": {
        "server": arg_flags.server,
        "freed_ram": 1.7 * arg_flags.threads,
        "pid_to_remove": ns.pid
      }
    }

    while(UPDATE_HANDLER.full()) {
      await ns.sleep(1000 + ((ns.pid * 10) % 1000))
    }
    while (!UPDATE_HANDLER.tryWrite(JSON.stringify(update_message_1))){
      await ns.sleep(1000 + ((ns.pid * 10) % 1000))
    }
    while (!UPDATE_HANDLER.tryWrite(JSON.stringify(update_message_2))){
      await ns.sleep(1000 + ((ns.pid * 10) % 1000))
    }
  }
  else {
    let update_message = {
      "action": "update_info",
      "update_info": {
        "server": arg_flags.server,
        "freed_ram": 1.7 * arg_flags.threads,
        "pid_to_remove": ns.pid
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