function round_ram_cost(number, decimal_places = 2) {
  let power = Math.pow(10, decimal_places)
  let num   = (number * power) * (1 - Math.sign(number) * Number.EPSILON)
  return Math.ceil(num) / power
}

/** @param {import("../.").NS} ns */
export async function main(ns) {
  // let server_a = ns.getServer("joesguns")
  // let server_a_min_diff_upg_needed = Math.log(1/server_a.minDifficulty) / Math.log(0.98)
  // ns.tprint(Math.ceil(server_a_min_diff_upg_needed))

  // ns.tprint(ns.getPlayer().mults.hacking_money * ns.getBitNodeMultipliers().ScriptHackMoney)
  // ns.tprint(ns.getPlayer().mults.hacknet_node_money * ns.getBitNodeMultipliers().HacknetNodeMoney)
  //ns.tprint(ns.heart.break())

  // let heart_keys = Object.keys(ns.heart)
  // for (let key of heart_keys) {
  //   ns.tprint("Key: " + key + ": " + ns.heart[key])
  // }

  // let ns_keys = Object.keys(ns)
  // for (let key of ns_keys) {
  //   ns.tprint("Key: " + key + ": " + ns[key])
  // }

  // ns.bypass() -- Raises an error
  // ns.alterReality() -- does nothing when called?
  // ns.rainbow("") -- Needs a string as input

  // let keys = Object.keys(ns.hacknet)
  // for (let key of keys) {
  //   ns.tprint("Key: " + key + ": " + ns.hacknet[key])
  // }

  // for (let j = 1; j <= 5; j++) {
  //   for (let i = 1; i <= 10; i++) {
  //     ns.tprint("Thread/Cores: " + i.toString().padStart(2) + "," + j.toString().padStart(2) + " Weaken Effect: " + round_ram_cost(ns.weakenAnalyze(i,j),7))
  //   }
  // }

  // let weaken_effect = 0.05
  // let weaken_core_effect = 0.003125


  // for (let j = 1; j <= 64; j++) {
  //   for (let i = 1; i <= 1000; i++) {
  //     let ns_weak_analyze = round_ram_cost(ns.weakenAnalyze(i,j),7)
  //     let calc_weak_analyze = round_ram_cost((weaken_effect * i) + (weaken_core_effect * (j-1) * i),7)
  //     if (ns_weak_analyze != calc_weak_analyze) {
  //       ns.tprint("Thread/Cores: " + i.toString().padStart(2) + "," + j.toString().padStart(2) + " NS: " + ns_weak_analyze + " Calc: " + calc_weak_analyze)
  //     }
  //   }
  // }

  const t = {
    "Shoplift": 2
   ,"Rob Store": 60
   ,"Mug": 4
   ,"Larceny": 90
   ,"Deal Drugs": 10
   ,"Bond Forgery": 300
   ,"Traffick Arms": 40
   ,"Homicide": 3
   ,"Grand Theft Auto": 80
   ,"Kidnap": 120
   ,"Assassination": 300
   ,"Heist": 600
  }
  const p = ns.getPlayer()
  const vsep = " ║ "
  const title =
    "Crime".padStart(16) + vsep
  + "Money".padStart(8) + vsep
  + "REP".padStart(8) + vsep
  + "Hack".padStart(8) + vsep
  + "STR".padStart(8) + vsep
  + "DEF".padStart(8) + vsep
  + "DEX".padStart(8) + vsep
  + "AGI".padStart(8) + vsep
  + "CHA".padStart(8) + vsep
  + "INT".padStart(8) + " ║"
  let wss = ""
  const title_sep = "".padStart(17,"═").padEnd(title.length,"╬══════════")
  for (let crime in ns.enums.CrimeType) {
    const c = ns.enums.CrimeType[crime]
    const ws = ns.formulas.work.crimeGains(p,c)
    const sc = ns.formulas.work.crimeSuccessChance(p,c)
    wss = wss + c.padStart(16) + vsep
    for (let key in ws) {
      wss = wss + ns.formatNumber((ws[key] * sc) / t[c]).padStart(8) + vsep
    }
    wss = wss + "\n"
    //ns.tprint("\n" + c.padStart(16) + ": " + sc.toFixed(2).padStart(6) + "%\n" + wss + "\n")
  }

  ns.tprint(
    "\n"
  + title + "\n"
  + title_sep + "\n"
  + wss
  )
}