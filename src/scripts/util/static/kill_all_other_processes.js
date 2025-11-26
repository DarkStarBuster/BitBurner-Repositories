import { ScanFilter, scan_for_servers } from "/src/scripts/util/dynamic/manage_server_scanning"

/**
 * @param {import("@ns").NS} ns
 */
export function kill_all_other_processes(ns) {
  let filter = new ScanFilter()
  filter.include_home = true
  filter.include_pserv = true
  let servers = scan_for_servers(ns, filter)
  let cnt = 0

  ns.tprint(`INFO: Killing all other processes.`)
  // Kill all possible actions on all servers apart from this process
  for (let server of servers) {
    let process_ids = ns.ps(server)
    if (process_ids.length != 0) {
      ns.tprint(`INFO: Killing processes on ${server}`)
    }
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