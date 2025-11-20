/** @param {import("@ns").NS} ns */
export async function main(ns) {
  const RAM_REQUEST_HANDLER   = ns.getPortHandle(5)

  let response = {
    "action" : "death_react"
   ,"pid" : 7549
  }
  
  while(!RAM_REQUEST_HANDLER.tryWrite(JSON.stringify(response))){
    await ns.sleep(10)
  }
}