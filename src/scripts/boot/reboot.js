import { PORT_IDS } from "/src/scripts/boot/manage_ports"
import { kill_all_other_processes } from "/src/scripts/util/static/kill_all_other_processes"

/** 
 * The RAM Cost of this Script is 4.05GB and it needs to be that
 * much as it cannot rely on any other scripts running to be able
 * to perform it's purpose.
 */


/** @param {import("@ns").NS} ns */
export async function main(ns) {

  const arg_flags = ns.flags([
    ["all"  ,false]
   ,["gang_mgr" ,false]
   ,["freeram",false]
   ,["hacknet_mgr",false]
   ,["root_mgr",false]
   ,["server_scan",false]
   ,["sleeve_mgr",false]
  ])

  if (arg_flags.all) {
    ns.tprint(`INFO: Rebooting...`)
    kill_all_other_processes(ns)
    ns.tprint(`INFO: Clearing Ports`)
    for (let id in PORT_IDS) {
      if (!(isNaN(id))) {
        ns.tprint(`INFO: Clearing Port ${id}.`)
        ns.getPortHandle(PORT_IDS[id]).clear()
      }
    }
    ns.tprint(`INFO: Run Boot...`)
    let filename = "/scripts/boot/boot.js"
    ns.run(filename)
    ns.ui.clearTerminal()
    ns.exit()
  }


  if (arg_flags.gang_mgr) {
    const UPDATE_HANDLER        = ns.getPortHandle(PORT_IDS.UPDATE_HANDLER)
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
    const UPDATE_HANDLER        = ns.getPortHandle(PORT_IDS.UPDATE_HANDLER)
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

  if (arg_flags.hacknet_mgr) {
    const UPDATE_HANDLER        = ns.getPortHandle(PORT_IDS.UPDATE_HANDLER)
    while(
      !UPDATE_HANDLER.tryWrite(
        JSON.stringify({
          "action": "request_action"
         ,"request_action": {
            "script_action": "reboot_hacknet"
          }
        })
      )
    ) {
      await ns.sleep(4)
    }
  }

  if (arg_flags.root_mgr) {
    const UPDATE_HANDLER        = ns.getPortHandle(PORT_IDS.UPDATE_HANDLER)
    while(
      !UPDATE_HANDLER.tryWrite(
        JSON.stringify({
          "action": "request_action"
         ,"request_action": {
            "script_action": "reboot_root_manager"
          }
        })
      )
    ) {
      await ns.sleep(4)
    }
  }

  if (arg_flags.server_scan) {
    const UPDATE_HANDLER        = ns.getPortHandle(PORT_IDS.UPDATE_HANDLER)
    while(
      !UPDATE_HANDLER.tryWrite(
        JSON.stringify({
          "action": "request_action"
         ,"request_action": {
            "script_action": "reboot_server_scan"
          }
        })
      )
    ) {
      await ns.sleep(4)
    }
  }

  if (arg_flags.sleeve_mgr) {
    const UPDATE_HANDLER        = ns.getPortHandle(PORT_IDS.UPDATE_HANDLER)
    while(
      !UPDATE_HANDLER.tryWrite(
        JSON.stringify({
          "action": "request_action"
         ,"request_action": {
            "script_action": "reboot_sleeve_mgr"
          }
        })
      )
    ) {
      await ns.sleep(4)
    }
  }
}