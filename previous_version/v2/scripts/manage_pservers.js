/** @param {import("@ns").NS} ns */
export async function main(ns) {
  const UPDATE_HANDLER = ns.getPortHandle(4)

  ns.disableLog("getServerMoneyAvailable")

  // Iterator we'll use for our loop
  let num_pserv = 0;

  let possible_ram = []
  for (let i = 1; i <= 20; i++) {
    possible_ram.push(2**i)
  }

  // ns.getPurchasedServerCost(<ram>)
  // ns.getPurchasedServerLimit()
  // ns.getPurchasedServerMaxRam()
  // ns.getPurchasedServers()
  // ns.getPurchasedServerUpgradeCost(<string>,<ram>)
  // ns.purchaseServer(<string>,<ram>)
  // ns.renamePurchasedServer(<string>,<string>)
  // ns.upgradePurchasedServer(<string>,<ram>)

  let p_servers = {}
  for (let server of ns.getPurchasedServers()){
    p_servers[server] = possible_ram.indexOf(ns.getServerMaxRam(server))
    num_pserv++
  }

  // Continuously try to purchase servers until we've reached the maximum
  // amount of servers
  ns.print("Start purchasing personal servers")
  while (num_pserv < ns.getPurchasedServerLimit()) {
    // Check if we have enough money to purchase a server
    if (
        ns.getServerMoneyAvailable("home") > ns.getPurchasedServerCost(possible_ram[0])
    &&  ns.getServerMoneyAvailable("home") > 2*1e6
    ) {
      // If we have enough money, then:
      //  1. Purchase the server
      //  2. Increment our iterator to indicate that we've bought a new server
      //  3. Tell the Central Control Server that we have a new server
      let server = ns.purchaseServer("pserv-" + num_pserv, possible_ram[0]);
      if (server != "") {
        ns.print("Bought " + server)
        p_servers[server] = 0
        num_pserv++;
        
        let update = {
        "action": "update_info",
        "update_info": {
          "server": server
          }
        }
        
        while(UPDATE_HANDLER.full()) {
          await ns.sleep(200)
        }
        UPDATE_HANDLER.write(JSON.stringify(update))
      }
    }
    //Make the script wait for a second before looping again.
    //Removing this line will cause an infinite loop and crash the game.
    await ns.sleep(1000);
  }
  ns.print("All personal servers purchased")

  
  let freeram_update = {
    "action": "request_action",
    "request_action": {
      "script_action": "freeram",
      "target": "home",
      "threads": 1
    }
  }
  while(UPDATE_HANDLER.full()) {
    await ns.sleep(200)
  }
  UPDATE_HANDLER.write(JSON.stringify(freeram_update))

  let max_ram_achieved = false
  while (!max_ram_achieved) {
    let maximised_pserv_cnt = 0
    for (let server in p_servers) {
      // 19 is the max index of possible_ram array
      if (p_servers[server] == 19) {
        maximised_pserv_cnt += 1
      }
      else {
        ns.print("Server: " + server + " [" + p_servers[server] + "]=>" + possible_ram[p_servers[server]+1] + " Upg. Cost: " + ns.getPurchasedServerUpgradeCost(server,possible_ram[p_servers[server]+1]))
        if (ns.getPurchasedServerUpgradeCost(server,possible_ram[p_servers[server]+1]) * 10 < ns.getServerMoneyAvailable("home")) {
          ns.print("Go for purchase")
          let upgraded = ns.upgradePurchasedServer(server,possible_ram[p_servers[server]+1])
          if (upgraded) {
            p_servers[server] = p_servers[server]+1
            let update = {
            "action": "update_info",
            "update_info": {
              "server": server,
              "max_ram": possible_ram[p_servers[server]]
              }
            }
            
            while(UPDATE_HANDLER.full()) {
              await ns.sleep(200)
            }
            UPDATE_HANDLER.write(JSON.stringify(update))
          }
          else {
            ns.print("Did not purchase")
          }
        }
      }
      
    }
    if (maximised_pserv_cnt == ns.getPurchasedServerLimit()){
      max_ram_achieved = true
    }
    await ns.sleep(1000)
  }
}