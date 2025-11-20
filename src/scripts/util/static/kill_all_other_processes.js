import { scan_for_servers } from "./scan_for_servers"

/**
 * @param {import("@ns").NS} ns
 */
export function kill_all_other_processes(ns) {
  let rooted_servers = scan_for_servers(ns,{"is_rooted":true,"include_home":true})
  let cnt = 0

  ns.tprint(`INFO: Killing all other processes.`)
  // Kill all possible actions on all servers apart from this process
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
  ns.tprint(`INFO: We killed ${cnt} processes during booting.`)
}