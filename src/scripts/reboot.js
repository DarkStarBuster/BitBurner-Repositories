import { scan_for_servers } from "/src/scripts/util/scan_for_servers"
import { PORT_IDS } from "/src/scripts/util/constant_utilities"
    
/**
 * @param {import("@ns").NS} ns
 */
function kill_all_other_processes(ns) {
  let rooted_servers = scan_for_servers(ns,{"is_rooted":true,"include_home":true})
  let cnt = 0
  // This function is called soon after control_v4.js is started.
  // We should have a clean slate to build from, so kill all possible actions on all servers apart from this process
  for (let server of rooted_servers) {
    let process_ids = ns.ps(server)
    for (let process of process_ids) {
      // Do not kill our own process
      if (process.pid == ns.pid) {
        continue
      }
      ns.kill(process.pid)
      cnt++
    }
  }

  ns.tprint("We killed " + cnt + " processes during reboot.")
  }

/** @param {import("@ns").NS} ns */
export async function main(ns) {
  const UPDATE_HANDLER        = ns.getPortHandle(PORT_IDS.UPDATE_HANDLER)

  const arg_flags = ns.flags([
    ["all"  ,false]
   ,["gang" ,false]
   ,["freeram",false]
  ])

  if (arg_flags.all) {
    kill_all_other_processes(ns)
    let filename = (IN_DEV ? "/development" : "") + "/scripts/control_v4.js"
    ns.exec(filename, "home")
  }

  if (arg_flags.gang) {
    while(
      !UPDATE_HANDLER.tryWrite(
        JSON.stringify({
          "action": "request_action"
         ,"request_action": {
            "script_action": "reboot_gang"
          }
        })
      )
    ) {
      await ns.sleep(4)
    }
  }

  if (arg_flags.freeram) {
    while(
      !UPDATE_HANDLER.tryWrite(
        JSON.stringify({
          "action": "request_action"
         ,"request_action": {
            "script_action": "reboot_freeram"
          }
        })
      )
    ) {
      await ns.sleep(4)
    }
  }
}