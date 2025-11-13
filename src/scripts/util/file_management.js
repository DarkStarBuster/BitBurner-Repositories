import { COLOUR, colourize } from "/scripts/util/colours"

const LOG_COLOUR = colourize(COLOUR.PURPLE, 9)
const DEFAULT_COLOUR = colourize(COLOUR.DEFAULT)

/**
 * @param {NS} ns
 * @param {string} filename
 */
export function delete_file(ns, filename) {
  ns.print(LOG_COLOUR + "FILE: Delteing file " + filename + DEFAULT_COLOUR)
  ns.rm(filename)
}

/**
 * @param {NS} ns
 * @param {string} filename
 */
export function clear_file(ns, filename) {
  ns.print(LOG_COLOUR + "FILE: Clearing contents of " + filename + DEFAULT_COLOUR)
  ns.clear(filename)
}

/**
 * @param {NS} ns
 * @param {string} filename
 */
export function rename_file(ns, filename, new_name) {
  ns.print(LOG_COLOUR + "FILE: Renaming file " + filename + " to " + new_name + DEFAULT_COLOUR)
  ns.mv("home", filename, new_name)
}

/**
 * @param {NS} ns
 * @param {string} filename
 * @param {string} line
 */
export function append_to_file(ns, filename, line) {
  //ns.print(LOG_COLOUR + "FILE: Appending line to " + filename + DEFAULT_COLOUR)
  ns.write(filename, line, "a")
}