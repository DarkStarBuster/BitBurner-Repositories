import { ServerStateInfo } from "/src/scripts/core/util_server_scanning";

class ServerControlParameters {
  max_name_length;

  /**
   * @param {import("@ns").NS} ns
   * @param {Object<string, ServerStateInfo>} server_info
   */
  constructor(ns, server_info) {
    let name_length = 0
    for (let server in server_info) {
      name_length = Math.max(name_length, server.length)
    }
    this.max_name_length = name_length
  }
}

class ScanMgrParameters {
  do_logging = false;
  constructor(ns) {}
}

class RAMControlParameters {
  free_amt = 16;

  /**
   * @param {import("@ns").NS} ns
   */
  constructor(ns) {}
}

class HackMgrControlParameters {
  consider_early = 64;
  hack_batch_time_interval = 125;
  total_hack_batch_limit = 40000 / 4;
  min_hack_threads_for_batch = 1;
  num_of_preppers = 2;

  /**
   * @param {import("@ns").NS} ns
   */
  constructor(ns) {}
}

class PServMgrControlParameters {
  max_ram_exponent_to_purchase = 20;
  min_amt_to_purchase_new = 2e6;
  ram_exponent_of_new_servers = 1;
  mult_for_purchase_upg = 10;

  /**
   * @param {import("@ns").NS} ns
   */
  constructor(ns) {}
}

class HacknetMgrControlParameters {
  calc_only = true;
  threshold = 5e-6;
  cost_mod = 1;
  /** @type {string} */
  hash_target = null;
  hash_time = Infinity;

  /**
   * @param {import("@ns").NS} ns
   */
  constructor(ns) {}
}

class GangMgrControlParameters {
  calc_only = false;
  open_ui = false;
  created = false;
  gang_income = 0;
  gang_faction = "Slum Snakes";
  check_faction = "The Black Hand";
  purchase_perc = 1/20;
  ascension_mult = 10;

  /**
   * @param {import("@ns").NS} ns
   */
  constructor(ns) {
    this.gang_faction = ns.enums.FactionName.SlumSnakes
    this.check_faction = ns.enums.FactionName.TheBlackHand
  }
}

class PlayerMgrControlParameters {
  desire = "gang";
  total_income = 0;
  player;

  /**
   * @param {import("@ns").NS} ns
   */
  constructor(ns) {}
}

export class ControlParameters {
  /** @type {ServerControlParameters}*/
  servers;
  /** @type {ScanMgrParameters} */
  scan_mgr;
  /** @type {RAMControlParameters} */
  home;       // rename to ram_mgr
  /** @type {HackMgrControlParameters} */
  hacker;     // rename to hack_mgr
  /** @type {PServMgrControlParameters} */
  pserv;      // renamge to pserv_mgr
  /** @type {HacknetMgrControlParameters} */
  hacknet_mgr;
  /** @type {GangMgrControlParameters} */
  gang_mgr;
  /** @type {PlayerMgrControlParameters} */
  player_mgr;

  /**
   * @param {import("@ns").NS} ns
   * @param {Object<string, ServerStateInfo>} server_info
   */
  constructor(ns, server_info) {
    this.servers = new ServerControlParameters(ns, server_info)
    this.scan_mgr = new ScanMgrParameters(ns)
    this.home = new RAMControlParameters(ns)
    this.hacker = new HackMgrControlParameters(ns)
    this.pserv = new PServMgrControlParameters(ns)
    this.hacknet_mgr = new HacknetMgrControlParameters(ns)
    this.gang_mgr = new GangMgrControlParameters(ns)
    this.player_mgr = new PlayerMgrControlParameters(ns)
  }
}