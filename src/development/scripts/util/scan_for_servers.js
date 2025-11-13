const DEPTH_LIMIT = 50


/**
 * @param {import("../../../.").NS} ns - NetScript environment
 * @param {string} server - Server to scan from
 * @param {Object} filters - Filters to apply (AND logic applies if multiple are definted)
 * @param {string[]} servers - Servers we have already visited
 * @param {string[]} results - The results of this recursive scan
 * @param {number} depth - depth of our current recursion
 * @param {number} depth_limit - limit of our recursion
 */
function scan_for_servers_recur(ns, server, filters = {}, servers = [], results = [], depth = 0, depth_limit = DEPTH_LIMIT) {
  let scan_results = ns.scan(server)

  // Loop over the servers we can see.
  for (let scan_result of scan_results) {
    // Have we encountered this server before in our search?
    if (!servers.includes(scan_result)) {
      // Record that we've encountered this server while searching.
      servers.push(scan_result)

      // Do we want to include this server in the result set?
      let fail_filter_cnt = 0
      for (let filter in filters) {
        switch (filter) {
          case "is_rooted":
            if (ns.hasRootAccess(scan_result) === filters[filter]) {
              continue
            }
            //ns.print("Failed due to root")
            fail_filter_cnt += 1
            break
          case "has_money":
            if ((ns.getServerMaxMoney(scan_result) > 0) === filters[filter]) {
              continue
            }
            //ns.print("Failed due to money")
            fail_filter_cnt += 1
            break
          case "has_ram":
            if ((ns.getServerMaxRam(scan_result) > 0) === filters[filter]) {
              continue
            }
            //ns.print("Failed due to ram")
            fail_filter_cnt += 1
            break
          case "include_home":
            continue // home is dealt with outside of the recursion function.
          case "include_pserv":
            if (
                scan_result.includes("pserv") === filters[filter]
            ||  !scan_result.includes("pserv")
            ) {
              continue
            }
            //ns.print("Failed due to pserv")
            fail_filter_cnt += 1
            break
          case "include_hacknet":
            if (
                scan_result.includes("hacknet") === filters[filter]
            ||  !scan_result.includes("hacknet")
            ) {
              continue
            }
            //ns.print("Failed due to hacknet")
            fail_filter_cnt += 1
            break
          default:
            //ns.print("Failed due to default")
            fail_filter_cnt += 1
            break
        }
        if (fail_filter_cnt > 0) {
          //ns.print("Server: " + scan_result + " Fail Cnt: " + fail_filter_cnt)
          break
        }
      }

      // No filters failing means we add it to the results
      if (fail_filter_cnt == 0) {
        results.push(scan_result)
      }

      // Recur one level deeper if we have not yet reached the depth_limit
      if (depth < depth_limit) {
        scan_for_servers_recur(ns, scan_result, filters, servers, results, depth + 1, depth_limit)
      }
    }
  }

  return results
}

/**
 * Always starts from "home".
 * 
 * @param {import("@ns").NS} ns - NetScript environment
 * @param {Object} filters - Filters to apply (AND logic applies if multiple are definted)
 * @return {string[]}
 */
export function scan_for_servers(ns, filters = {}) {
  let servers = ["home"]
  let results = []

  // Do we want to include "home" in the result set?
  let fail_filter_cnt = 0
  for (let filter in filters) {
    switch (filter) {
      case "is_rooted":
        if (ns.hasRootAccess("home") === filters[filter]) {
          continue
        }
        fail_filter_cnt += 1
        break
      case "has_money":
        if ((ns.getServerMaxMoney("home") > 0) === filters[filter]) {
          continue
        }
        fail_filter_cnt += 1
        break
      case "has_ram":
        if ((ns.getServerMaxRam("home") > 0) === filters[filter]) {
          continue
        }
        fail_filter_cnt += 1
        break
      case "include_home":
        if (filters[filter]) {
          continue
        }
        fail_filter_cnt += 1
        break
      case "include_pserv":
        continue
        break
      case "include_hacknet":
        continue
        break
      default:
        fail_filter_cnt += 1
        break
    }
    if (fail_filter_cnt > 0) {
      break
    }
  }

  // No filters failing means we add it to the results
  if (fail_filter_cnt == 0) {
    results.push("home")
  }

  return scan_for_servers_recur(ns, "home", filters, servers, results)
}