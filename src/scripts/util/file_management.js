import { COLOUR, colourize } from "/src/scripts/util/constant_utilities"

const LOG_COLOUR = colourize(COLOUR.PURPLE, 9)
const DEFAULT_COLOUR = colourize(COLOUR.DEFAULT)

/**
 * @param {import("@ns").NS} ns
 * @param {string} filename
 */
export function delete_file(ns, filename) {
  ns.rm(filename)
}

/**
 * @param {import("@ns").NS} ns
 * @param {string} filename
 */
export function clear_file(ns, filename) {
  ns.clear(filename)
}

/**
 * @param {import("@ns").NS} ns
 * @param {string} filename
 */
export function rename_file(ns, filename, new_name) {
  ns.mv("home", filename, new_name)
}

/**
 * @param {import("@ns").NS} ns
 * @param {string} filename
 * @param {string} line
 */
export function append_to_file(ns, filename, line) {
  ns.write(filename, line, "a")
}