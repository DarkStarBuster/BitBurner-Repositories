/**
 * @param {NS} ns
 * @param {Object} contract_info
 * @param {any} result
 */
function log_attempt_result(ns,contract_info,result) {
  let reward = ns.codingcontract.attempt(result, contract_info.contract_file, contract_info.contract_server)

  if (reward) {
    ns.tprint("Successfully finished contract " + contract_info.contract_file + ", reward is: " + reward)
  }
  else {
    ns.tprint("Failed 'Find Largest Prime Factor' contract " + contract_info.contract_file+ " on " + contract_info.contract_server)
    ns.tprint("Data Given: " + contract_info.contract_data)
    ns.tprint("Result Calculated: " + result)
  }
}

/**
 * @param {NS} ns
 * @param {Object} contract_info
 */
function solve_flpf_cct(ns, contract_info) {
  let number = contract_info.contract_data
  let factor = 2

  while (factor <= number) {
    if (number % factor == 0) { //number is divisible cleanly by factor
      number /= factor
    }
    else {
      factor++;
    }
  }

  log_attempt_result(ns,contract_info,factor)
}

/**
 * @param {NS} ns
 * @param {Object} contract_info
 */
function solve_swms_cct(ns, contract_info) {

  let contract_data = contract_info.contract_data

  let subarray_value = -Infinity
  let num_array = [0]
  num_array.pop()
  for (let value of contract_data) {
    if (value > subarray_value) {
      subarray_value = value
    }
    num_array.push(value)
  }

  let array_length = num_array.length
  let subarray_length = 2
  while (subarray_length <= array_length) {
    for(let i = 0; i < array_length - subarray_length; i++) {
      let subarray = num_array.slice(i,i+subarray_length)

      if (
          subarray[0] <= 0
      ||  subarray[subarray.length-1] <= 0
      ||  subarray[0] + subarray[1] <= 0
      ||  subarray[subarray.length-1] + subarray[subarray.length-2] <= 0
      ) {
        // A subarray that starts with zero or a negative number
        // will not have a larger sum than the subarray that is one
        // shorter and doesn't include this number.
        // The same applies to the last element of the subarray.
        // The same applies if the sum of the first or last x elements is negative.
        continue
      }
      let sum = 0
      for(let value of subarray) {
        sum += value
      }
      if (sum > subarray_value) {
        subarray_value = sum
      }
    }
    subarray_length += 1
  }

  log_attempt_result(ns,contract_info,subarray_value)
}

/**
 * @param {NS} ns
 * @param {Object} contract_info
 */
function solve_twts_cct(ns, contract_info) {
  let contract_data = contract_info.contract_data

  let num_to_sum = 0
  let num_to_use = []
  if (typeof contract_data == "number") {
    // Total Ways to Sum
    num_to_sum = contract_data
    for (let i = 1; i < num_to_sum; i++) {
      num_to_use.push(i)
    }
  }
  else {
    // Total Ways to Sum II
    num_to_sum = contract_data[0]
    num_to_use = contract_data[1]
  }

  let array = [1]
  array.length = num_to_sum + 1 // Value in final cell of the array will be our answer.
  array.fill(0,1) // populate array with 0 in all newly added cells.

  // I can almost see how this works, but find myself lacking a little bit of understanding
  // that would allow me to write it down.
  for (let i = 0; i < num_to_use.length; i++) {
    for(let j = num_to_use[i]; j <= num_to_sum; j++) {
      array[j] += array[j-num_to_use[i]]
    }
  }

  log_attempt_result(ns,contract_info,array[num_to_sum])
}

/**
 * @param {NS} ns
 * @param {Object} contract_info
 */
function solve_sm_cct(ns, contract_info) {
  let matrix = contract_info.contract_data

  let y_min = 0
  let y_max = matrix.length - 1
  let x_min = 0
  let x_max = matrix[0].length - 1

  let spiral_matrix = []
  //spiral_matrix.length = x*y //don't need this, just push into the array

  // Start going right from [0][0]
  let direction = "R"
  let x = 0
  let y = 0

  while (true) {
    spiral_matrix.push(matrix[y][x])
    if (y_max < y_min || x_max < x_min) {
      break
    }

    switch (direction) {
      case "R":
        if (!(++x < x_max)) {
          direction = "D"
          y_min++
        }
        break
      case "D":
        if (!(++y < y_max)) {
          direction = "L"
          x_max--
        }
        break
      case "L":
        if (!(--x > x_min)) {
          direction = "U"
          y_max--
        }
        break
      case "U":
        if (!(--y > y_min)) {
          direction = "R"
          x_min++
        }
        break
    }
  }

  log_attempt_result(ns,contract_info,spiral_matrix)
}

/**
 * @param {NS} ns
 * @param {Object} contract_info
 */
function solve_ajg_cct(ns, contract_info) {

  let array = contract_info.contract_data

  let index = 0
  for (let distance = 0; index < array.length && index <= distance; index++) {
    distance = Math.max(index + array[index], distance)
  }

  log_attempt_result(ns,contract_info,(index == array.length) ? 1 : 0)
}



/** @param {NS} ns */
export async function main(ns) {
  const UPDATE_HANDLER = ns.getPortHandle(4)
  const arg_flags = ns.flags([ 
    ["server",""],
    ["contract_info",""]
  ])

  let contract_info = JSON.parse(arg_flags.contract_info)

  let contract_server = contract_info.contract_server
  let contract_file = contract_info.contract_file
  let contract_type = contract_info.contract_type
  let contract_data = contract_info.contract_data
  let contract_attempts = contract_info.contract_attempts

  ns.tprint(
    "\n"
  + "Server: " + contract_server + "\n"
  + "File: " + contract_file + "\n"
  + "Type: " + contract_type + "\n"
  + "Data: " + JSON.stringify(contract_data) + ", TypeOf: " + typeof contract_data + "\n"
  + "Attempts: " + contract_attempts + "\n"
  + "Description: \n" + ns.codingcontract.getDescription(contract_file,contract_server)
  )

  switch (contract_info.contract_type) {
    case "Find Largest Prime Factor":
      solve_flpf_cct(ns,contract_info)
      break
    case "Subarray with Maximum Sum":
      solve_swms_cct(ns,contract_info)
      break
    case "Total Ways to Sum":
    case "Total Ways to Sum II":
      solve_twts_cct(ns,contract_info)
      break
    case "Spiralize Matrix":
      solve_sm_cct(ns,contract_info)
      break
    case "Array Jumping Game":
      // Server: home
      // File: contract-128693.cct
      // Type: Array Jumping Game
      // Data: [0,10,5,1,4,10,0,0,8,5,10,9,10,5,5,5,10,10,0,8,8,6], TypeOf: object
      // Attempts: 1
      // Description: 
      // You are given the following array of integers:
      
      //  0,10,5,1,4,10,0,0,8,5,10,9,10,5,5,5,10,10,0,8,8,6
      
      //  Each element in the array represents your MAXIMUM jump length at that position. This means that if you are at position i and your maximum jump length is n, you can jump to any position from i to i+n. 
      
      // Assuming you are initially positioned at the start of the array, determine whether you are able to reach the last index.
      
      //  Your answer should be submitted as 1 or 0, representing true and false respectively
      solve_ajg_cct(ns,contract_info)
      break
    case "Array Jumping Game II":
      break
    case "Merge Overlapping Intervals":
      break
    case "Generate IP Addresses":
      break
    case "Algorithmic Stock Trader I":
      break
    case "Algorithmic Stock Trader II":
      break
    case "Algorithmic Stock Trader III":
      break
    case "Algorithmic Stock Trader IV":
      break
    case "Minimum Path Sum in a Triangle":
      break
    case "Unique Paths in a Grid I":
      break
    case "Unique Paths in a Grid II":
      break
    case "Shortest Path in a Grid":
      break
    case "Sanitize Parentheses in Expression":
      break
    case "Find All Valid Math Expressions":
      break
    case "HammingCodes: Integer to Encoded Binary":
      break
    case "HammingCodes: Encoded Binary to Integer":
      break
    case "Proper 2-Coloring of a Graph":
      break
    case "Compression I: RLE Compression":
      break
    case "Compression II: LZ Decompression":
      break
    case "Compression III: LZ Compression":
      break
    case "Encryption I: Caesar Cipher":
      break
    case "Encryption II: Vigenère Cipher":
      break
  }
  
  let update_message = {
    "action": "update_info",
    "update_info": {
      "server": arg_flags.server,
      "freed_ram": 1.7 * arg_flags.threads,
      "pid_to_remove": ns.pid
    }
  }

  while(UPDATE_HANDLER.full()) {
    await ns.sleep(1000 + ((ns.pid * 10) % 1000))
  }
  while (!UPDATE_HANDLER.tryWrite(JSON.stringify(update_message))){
    await ns.sleep(1000 + ((ns.pid * 10) % 1000))
  }
}