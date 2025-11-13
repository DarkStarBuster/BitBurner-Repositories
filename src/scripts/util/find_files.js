import { scan_for_servers } from "/src/scripts/util/scan_for_servers"
import { COLOUR, colourize } from "/src/scripts/util/colours"

/** @param {import("@ns").NS} ns */
export async function main(ns) {

  let servers = scan_for_servers(ns, {"include_home":false,"include_hacknet":true,"include_pserv":true})

  for (let server of servers) {
    let files = ns.ls(server)
    files = files.filter(
      function(value, index, array) {
        if (value.includes(".js")) return false
        return true
      }
    )
    if (files.length > 0) {
      let string = "\nServer: " + server + "\nFiles found: \n"
      for (let file of files) {
        if (!file.includes(".js")) {
          string = string + file + "\n"
        }
      }
      ns.tprint(string)
    }
  }
}