import { PORT_IDS } from "/scripts/util/port_management"
import { COLOUR, colourize } from "/scripts/util/colours"

/** @param {NS} ns */
export async function main(ns) {
  const CONTROL_PARAMETERS    = ns.getPortHandle(PORT_IDS.CONTROL_PARAM_HANDLER)
  const BITNODE_MULTS_HANDLER = ns.getPortHandle(PORT_IDS.BITNODE_MULTS_HANDLER)
  const UPDATE_HANDLER        = ns.getPortHandle(PORT_IDS.UPDATE_HANDLER)

  while (
      CONTROL_PARAMETERS.empty()
  ||  BITNODE_MULTS_HANDLER.empty()
  ) {
    await ns.sleep(50)
  }

  let control_params = JSON.parse(CONTROL_PARAMETERS.peek())
  let bitnode_mults = JSON.parse(BITNODE_MULTS_HANDLER.peek())

  ns.disableLog("getServerMoneyAvailable")

  ns.setTitle("Manage Personal Servers V2.0 - PID: " + ns.pid)
  
  // Multiplier to Cost of New Server/Upgrading Server no matter the RAM
  let pserv_cost_mult         = bitnode_mults["PurchasedServerCost"]
  // Multiplier to Cost of New Server/Upgrading Server if over 64 GB RAM
  let pserv_cost_softcap_mult = bitnode_mults["PurchasedServerSoftcap"]
  // Mutliplier to the Number of Servers we can have
  let pserv_server_limit_mult = bitnode_mults["PurchasedServerLimit"]
  // Multiplier to the Max RAM that can be purchased
  let pserv_max_ram_mult      = bitnode_mults["PurchasedServerMaxRam"]

  // Control Parameters
  let max_ram       = control_params.pserv.max_ram_exponent_to_purchase
  let min_amt_purch = control_params.pserv.min_amt_to_purchase_new
  let min_ram_purch = control_params.pserv.ram_exponent_of_new_servers
  let purchase_mult = control_params.pserv.mult_for_purchase_upg

  let max_exponent = 20
  max_exponent = Math.min(Math.floor(max_exponent * pserv_max_ram_mult), max_ram)
  min_ram_purch = Math.min(Math.floor(max_exponent * pserv_max_ram_mult), min_ram_purch)

  // Array of all purchaseable levels of RAM
  // possible_ram[0] =  2 GB | possible_ram[5] =   64 GB | possible_ram[10] =  2048 GB | possible_ram[15] =   65536 GB
  // possible_ram[1] =  4 GB | possible_ram[6] =  128 GB | possible_ram[11] =  4096 GB | possible_ram[16] =  131072 GB
  // possible_ram[2] =  8 GB | possible_ram[7] =  256 GB | possible_ram[12] =  8192 GB | possible_ram[17] =  262144 GB
  // possible_ram[3] = 16 GB | possible_ram[8] =  512 GB | possible_ram[13] = 16384 GB | possible_ram[18] =  524288 GB
  // possible_ram[4] = 32 GB | possible_ram[9] = 1024 GB | possible_ram[14] = 32768 GB | possible_ram[19] = 1048576 GB
  let possible_ram = []
  for (let i = 1; i <= max_exponent; i++) {
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
  
  // Tracking the number of personal servers we have.
  let num_pserv = 0;
  
  // How many personal servers do we already have?
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
        ns.getServerMoneyAvailable("home") > ns.getPurchasedServerCost(possible_ram[min_ram_purch-1])
    &&  ns.getServerMoneyAvailable("home") > min_amt_purch
    ) {
      // If we have enough money, then:
      //  1. Purchase the server
      //  2. Increment our iterator to indicate that we've bought a new server
      //  3. Tell the Central Control Server that we have a new server
      let server = ns.purchaseServer("pserv-" + num_pserv, possible_ram[min_ram_purch-1]);
      if (server != "") {
        ns.print("Bought " + server)
        p_servers[server] = min_ram_purch-1
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
    await ns.sleep(1000);
  }
  ns.print("All personal servers purchased")

  
  let freeram_update = {
    "action": "request_action",
    "request_action": {
      "script_action": "freeram"
    }
  }
  while(UPDATE_HANDLER.full()) {
    await ns.sleep(50)
  }
  UPDATE_HANDLER.write(JSON.stringify(freeram_update))

  let max_ram_achieved = false
  while (!max_ram_achieved) {
    let maximised_pserv_cnt = 0
    for (let server in p_servers) {
      if (p_servers[server] == possible_ram.length - 1) {
        maximised_pserv_cnt += 1
      }
      else {
        ns.print("Server: " + server + " [" + p_servers[server] + "]=>" + possible_ram[p_servers[server]+1] + " Upg. Cost: " + ns.getPurchasedServerUpgradeCost(server,possible_ram[p_servers[server]+1]))
        if (
            (ns.getPurchasedServerUpgradeCost(server,possible_ram[p_servers[server]+1]) * purchase_mult) < ns.getServerMoneyAvailable("home")
        &&  possible_ram[p_servers[server]+1] < ns.getServerMaxRam("home")
        ) {
          ns.print("Go for purchase")
          let upgraded = ns.upgradePurchasedServer(server,possible_ram[p_servers[server]+1])
          if (upgraded) {
            p_servers[server] = p_servers[server]+1
            let update = {
              "action": "update_info",
              "update_info": {
                "server": server
              }
            }
            
            while(UPDATE_HANDLER.full()) {
              await ns.sleep(50)
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