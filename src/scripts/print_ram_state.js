import { PORT_IDS } from "/src/scripts/boot/manage_ports"

/** @param {import("@ns").NS} ns */
export async function main(ns) {
  const RAM_REQUEST_HANDLER   = ns.getPortHandle(PORT_IDS.RAM_REQUEST_HANDLER)
  const RAM_PROVIDE_HANDLER   = ns.getPortHandle(PORT_IDS.RAM_PROVIDE_HANDLER)

  let request = {
    "action"   : "print_ram_state",
    "requester": ns.pid
  }

  while(!RAM_REQUEST_HANDLER.tryWrite(JSON.stringify(request))){
    await ns.sleep(10)
  }

  let response
  let awaiting_response = true
  while(awaiting_response) {
    while(RAM_PROVIDE_HANDLER.empty()) {
      await ns.sleep(10)
    }
    response = JSON.parse(RAM_PROVIDE_HANDLER.peek())
    if (parseInt(response.requester) === ns.pid) {
      awaiting_response = false
      RAM_PROVIDE_HANDLER.read()
    }
    else {
      await ns.sleep(10)
    }
  }

  // let ram_state = JSON.stringify(response.state)
  // ram_state.replaceAll(",",",\n")
  // ram_state.replaceAll("{","{\n")
  // ns.write("RAMStateExport.js",ram_state,"w")
  let ram_state = response.state
  let indent = 0
  let file = "RAMStateExport.txt"
  ns.write(file,"{\n","w")
  indent = indent + 2
  for (let server in ram_state) {
    let string = "".padStart(indent) + "\"" + server + "\":{\n"
    indent = indent + 2
    ns.write(file,string,"a")
    string = "".padStart(indent) + "\"max_ram\":" + ram_state[server].max_ram + ",\n"
    ns.write(file,string,"a")
    string = "".padStart(indent) + "\"free_ram\":" + ram_state[server].free_ram + ",\n"
    ns.write(file,string,"a")
    string = "".padStart(indent) + "\"ram_slices\":{\n"
    indent = indent + 2
    ns.write(file,string,"a")
    for (let slice in ram_state[server].ram_slices) {
      string = "".padStart(indent) + "\"" + slice + "\":{\n"
      indent = indent + 2
      ns.write(file,string,"a")
      string = "".padStart(indent) + "\"slice_amount\":" + ram_state[server].ram_slices[slice].slice_amount + ",\n"
      ns.write(file,string,"a")
      string = "".padStart(indent) + "\"pid_filename\":" + ram_state[server].ram_slices[slice].pid_filename + "\n"
      ns.write(file,string,"a")
      string = "".padStart(indent) + "EXTRA - IS RUNNING: " + ns.isRunning(parseInt(slice)) + "\n"
      ns.write(file,string,"a")
      indent = indent - 2
      string = "".padStart(indent) + "},\n"
      ns.write(file,string,"a")
    }
    indent = indent - 2
    string = "".padStart(indent) + "}\n"
    ns.write(file,string,"a")
    indent = indent - 2
    string = "".padStart(indent) + "},\n"
    ns.write(file,string,"a")
  }
  indent = indent - 2
  ns.write(file,"}","a")
  
}