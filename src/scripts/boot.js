import { scan_for_servers } from "/src/scripts/util/scan_for_servers"
import { PORT_NAMES } from "/src/scripts/manage_ports"

/**
 * @param {import("@ns").NS} ns
 */
function kill_all_other_processes(ns) {
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

/** @param {import("@ns").NS} ns */
async function setup_port_ids(ns) {
  let ports = []
  ns.tprint(`INFO: Setting up port IDs.`)
  for (let name in PORT_NAMES) {
    let pid = ns.run("scripts/util/pid_provider.js")
    if (pid === 0) {
      ns.tprint(`ERROR: Failed to run pid provider script. Aborting startup process.`)
      ns.exit()
    }
    ports.push(`--${name}`)
    ports.push(pid)
  }

  ns.run("scripts/manage_ports.js", {threads:1,temporary:true}, ...ports)
  ns.tprint(`INFO: Setup ${ports.length / 2} ports.`)
}

/** @param {import("@ns").NS} ns */
export async function main(ns) {

  // Ensure nothing else is running
  kill_all_other_processes(ns)

  // Setup static port handlers
  setup_port_ids(ns)

  // Begin main control loop
  ns.run("scripts/control_v4.js", {threads:1, temporary:true})

}