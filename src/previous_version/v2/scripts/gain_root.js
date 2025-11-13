/** @param {NS} ns */
export async function main(ns) {
  var hack_dictionary = {
    "brute": ns.fileExists("BruteSSH.exe"),
    "ftp": ns.fileExists("FTPCrack.ext"),
    "smtp": ns.fileExists("relaySMTP.exe"),
    "http": ns.fileExists("HTTPWorm.exe"),
    "sql": ns.fileExists("SQLInject.exe"),
  }
  var server = ns.args[0]
  ns.tprint("here: " + server)

  var req_ports = ns.getServerNumPortsRequired(server)
  if (req_ports > 0){
    var ports_opened = 0
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
  }
  if (ports_opened < req_ports){
    ns.tprint("Failed to gain root access to " + server + ": not enough ports opened")
  }
  else {
    ns.nuke(server)
    ns.tprint("Successfully rooted " + server)
  }
}