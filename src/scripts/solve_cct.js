/**
 * @param {import("@ns").NS} ns
 * @param {Object} contract_info
 * @param {any} result
 */
function log_attempt_result(ns,contract_info,result) {
  let reward = ns.codingcontract.attempt(result, contract_info.contract_file, contract_info.contract_server)

  if (reward) {
    ns.tprint("Successfully finished contract " + contract_info.contract_file + ", reward is: " + reward)
  }
  else {
    ns.tprint("Failed " + contract_info.contract_type + " contract " + contract_info.contract_file + " on " + contract_info.contract_server)
    ns.tprint("Data Given: " + contract_info.contract_data)
    ns.tprint("Result Calculated: " + result)
  }
}

/**
 * @param {import("@ns").NS} ns
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
 * @param {import("@ns").NS} ns
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
    for(let i = 0; i <= array_length - subarray_length; i++) {
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
 * @param {import("@ns").NS} ns
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
 * @param {import("@ns").NS} ns
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
  if (matrix[0].length == 1) {
    // If matrix is only 1 wide, we need to be going down to start with.
    direction = "D"
  }
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
 * @param {import("@ns").NS} ns
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

/**
 * @param {import("@ns").NS} ns
 * @param {Object} contract_info
 */
function solve_ajg2_cct(ns, contract_info) {

  let array = contract_info.contract_data
  if (array[0] == 0) {
    log_attempt_result(ns,contract_info, 0)
    return
  }
  const n = array.length;
  let distance = 0;
  let jumps = 0;
  let last_jump_origin = -1;
  // While we haven't reach the final index
  while (distance < n - 1) {
      let jump_origin = -1;
      // Start from the distance we have reached, loop back until we get to the point we jumped from.
      for (let i = distance; i > last_jump_origin; i--) {
          // If this index of the array allows us to get further along the array, mark it as our next jump
          if (i + array[i] > distance) {
              distance = i + array[i];
              jump_origin = i;
          }
      }
      // If we didn't find an index that jumps us further along the array we cannot reach the end, break.
      if (jump_origin === -1) {
          jumps = 0;
          break;
      }
      last_jump_origin = jump_origin;
      jumps++;
  }

  // Either we have 0 jumps or the minimum number of jumps needed to get to the end.
  log_attempt_result(ns,contract_info,jumps)
}

function recur_through_triangle(ns, triangle , cache, level, index) {

  // There are no more levels to look throgh, so return the value of this node of the triangle.
  if (level == (triangle.length - 1)) {
    return triangle[level][index]
  }

  // Initialize the cache level object.
  if (
    cache[level+1] === undefined
  ){
    cache[level+1] = {}
  }
  
  // Set the cache value to the result of this function called on the two choices
  if (cache[level+1][index] === undefined) {
    cache[level+1][index] = recur_through_triangle(ns, triangle, cache, level+1, index)
  }
  if (cache[level+1][index+1] === undefined) {
    cache[level+1][index+1] = recur_through_triangle(ns, triangle, cache, level+1, index+1)
  }

  // Return the lesser value of the two cached values.
  return (cache[level+1][index] > cache[level+1][index+1] ? cache[level+1][index+1] : cache[level+1][index]) + triangle[level][index]
}

/**
 * @param {import("@ns").NS} ns 
 * @param {Object} contract_info 
 */
function solve_mpsiat_cct(ns, contract_info) {
  let array = contract_info.contract_data

  let result = recur_through_triangle(ns, array, {}, 0, 0)
  
  // Recurring through the triangle should have given us the shortest path.
  log_attempt_result(ns, contract_info, result)
}

function factorial(start) {
  if (
      start == 0
  ||  start == 1
  ) {
    return 1
  }
  if (start < 0) return 0
  return start * factorial(start-1)
}

/**
 * @param {import("@ns").NS} ns 
 * @param {Object} contract_info 
 */
function solve_upiag1_cct(ns, contract_info) {
  let data = contract_info.contract_data

  let x = data[0]
  let y = data[1]

  let top = factorial(x+y-2)
  let bot = factorial(x-1) * factorial(y-1)

  log_attempt_result(ns, contract_info, top/bot)
}

/**
 * @param {import("@ns").NS} ns 
 * @param {Object} contract_info 
 */
function solve_upiag2_cct(ns, contract_info) {
  let array = contract_info.contract_data

  for (let y = 0; y < array.length; y++) {
    for (let x = 0; x < array[0].length; x++) {
      // This cell is an Obstacle. No Paths can pass through it
      // so we set it to Zero.
      if (array[y][x] == 1) {
        array[y][x] = 0
      }
      // We are at the Origin. If the Origin is not an obstacle
      // we set it as One.
      else if (y == 0 && x == 0) {
        array[y][x] = 1
      }
      // Neither Origin nor Obstacle, paths that pass through this cell
      // are equal to the sum of the paths that pass through the cell
      // above or to the left of this cell.
      else {
        if (y > 0) array[y][x] = array[y][x] + array[y-1][x]
        if (x > 0) array[y][x] = array[y][x] + array[y][x-1]
      }
    }
  }

  // Since a cells contents will now be eqaul to the number of paths
  // that pass through it. Our answer should be in the bottom right cell
  // of the array.
  log_attempt_result(ns, contract_info, array[array.length-1][array[0].length-1])
}

/**
 * 
 * @param {import("../../.").NS} ns 
 * @param {Object} contract_info 
 */
function solve_e1cc_cct(ns, contract_info) {
  /** @type {string} */
  let string = contract_info.contract_data[0]
  let shift  = contract_info.contract_data[1]
  let result = ""
  for (let char of string) {
    if (char === " ") {
      result = result + " "
    }
    else {
      // "A" is 65, so remove that, the shift by the shift parameter (bound by the 26 letters)
      // -1 % 26 is 25, which is why it works.
      result = result + String.fromCharCode(((char.charCodeAt(0) - (65 + shift) + 26) % 26) + 65)
    }
  }
  log_attempt_result(ns, contract_info, result)
}

/**
 * 
 * @param {import("../../.").NS} ns 
 * @param {Object} contract_info 
 */
function solve_e2vc_cct(ns, contract_info) {
  /** @type {string} */
  let string = contract_info.contract_data[0]
  /** @type {string} */
  let pass   = contract_info.contract_data[1]

  let result = ""
  let cnt = 0
  for (let char of string) {
    let shift = (pass[cnt % pass.length].charCodeAt(0) - 65) * -1
    result = result + String.fromCharCode(((char.charCodeAt(0) - (65 + shift) + 26) % 26) + 65)
    cnt++
  }
  log_attempt_result(ns, contract_info, result)
}

function solve_spiag_cct(ns, contract_info) {
  /** @type {number[][]} */
  let grid = contract_info.contract_data
  let height = grid.length
  let width  = grid[0].length

  function valid(y,x){
    return y >= 0 && y < height && x >= 0 && x < width
  }

  grid.forEach(
    function(array) {
      array.forEach(
        function(value, index, array) {
          if(value == 1) {
            array[index] = Infinity
          }
        }
      )
    }
  )

  let result = ""
  if (
      grid[0][0] === Infinity
  ||  grid[height-1][width-1] === Infinity
  ) {
    ns.tprint("No Path Possible")
    result = ""
  }
  else {
    let queue = [[0,0]]
    while (queue.length > 0) {
      let [y,x] = queue.shift()
      if (y == 0 && x == 0) {
        grid[0][0] = 1
      }
      if (valid(y-1,x) && grid[y-1][x] == 0) {queue.push([y-1,x]); grid[y-1][x] = grid[y][x]+1;} // Check Up
      if (valid(y+1,x) && grid[y+1][x] == 0) {queue.push([y+1,x]); grid[y+1][x] = grid[y][x]+1;} // Check Down
      if (valid(y,x-1) && grid[y][x-1] == 0) {queue.push([y,x-1]); grid[y][x-1] = grid[y][x]+1;} // Check Left
      if (valid(y,x+1) && grid[y][x+1] == 0) {queue.push([y,x+1]); grid[y][x+1] = grid[y][x]+1;} // Check Right
    }
    //ns.tprint("Grid:\n" + grid);
    if (grid[height-1][width-1] === 0) {
      result = ""
    }
    else {
      let y = height-1
      let x = width-1
      while (!(y==0 && x==0)) {
        //ns.tprint("Grid["+y+"]["+x+"]="+grid[y][x])
        if      (valid(y-1,x) && grid[y-1][x] < grid[y][x]) {result = "D" + result; y = y-1;} // Check Up
        else if (valid(y+1,x) && grid[y+1][x] < grid[y][x]) {result = "U" + result; y = y+1;} // Check Down
        else if (valid(y,x-1) && grid[y][x-1] < grid[y][x]) {result = "R" + result; x = x-1;} // Check Left
        else if (valid(y,x+1) && grid[y][x+1] < grid[y][x]) {result = "L" + result; x = x+1;} // Check Right
        else {ns.tprint("This shouldn't happen"); break;}
      }
    }
  }

  //ns.tprint("Result: " + result)
  log_attempt_result(ns, contract_info, result)
}

/**
 * 
 * @param {import("../../.".NS)} ns 
 * @param {Object} contract_info 
 */
function solve_moi_cct(ns, contract_info) {
  /** @type {number[][]} */
  let intervals = contract_info.contract_data

  // let string = ""
  // for (let interval of intervals) {
  //   if (!(string === "")) { string = string + ","}
  //   string = string + "[" + interval[0] + "," + interval[1] + "]"
  // }
  // ns.tprint("Intervals: " + string)

  intervals.sort(
    // Negative Result means a before b
    // Zero Result means no change
    // Positive Result means b before a
    function(a,b) {
      if(a[0] < b[0]) return -1
      if(a[0] > b[0]) return +1
      else return 0
    }
  )
  // string = ""
  // for (let interval of intervals) {
  //   if (!(string === "")) { string = string + ","}
  //   string = string + "[" + interval[0] + "," + interval[1] + "]"
  // }
  // ns.tprint("Sorted: " + string)

  let result = [intervals.shift()]
  while (intervals.length > 0) {
    let to_merge = intervals.shift()
    if(
        to_merge[0] >= result[result.length-1][0]
    &&  to_merge[0] <= result[result.length-1][1]
    ) {
      if(to_merge[1] > result[result.length-1][1]) {
        result[result.length-1][1] = to_merge[1]
      }
    }
    else {
      result.push(to_merge)
    }
  }
  
  let string = ""
  for (let interval of result) {
    if (!(string === "")) { string = string + ","}
    string = string + "[" + interval[0] + "," + interval[1] + "]"
  }
  // ns.tprint("Merged: " + string)

  // Needs to be returned as a string, apparently.
  log_attempt_result(ns, contract_info, string)
}

/** @param {import("@ns").NS} ns */
export async function main(ns) {
  const arg_flags = ns.flags([ 
    ["contract_info",""]
  ])

  let contract_info = JSON.parse(arg_flags.contract_info)

  let contract_server = contract_info.contract_server
  let contract_file = contract_info.contract_file
  let contract_type = contract_info.contract_type
  let contract_data = contract_info.contract_data
  // let contract_attempts = contract_info.contract_attempts

  // ns.tprint(
  //   "\n"
  // + "Server: " + contract_server + "\n"
  // + "File: " + contract_file + "\n"
  // + "Type: " + contract_type + "\n"
  // + "Data: " + JSON.stringify(contract_data) + ", TypeOf: " + typeof contract_data + "\n"
  // + "Attempts: " + contract_attempts + "\n"
  // + "Description: \n" + ns.codingcontract.getDescription(contract_file,contract_server)
  // )

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
      solve_ajg_cct(ns,contract_info)
      break
    case "Array Jumping Game II":
      solve_ajg2_cct(ns,contract_info)
      break
    case "Merge Overlapping Intervals":
      solve_moi_cct(ns,contract_info)
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
      solve_mpsiat_cct(ns,contract_info)
      break
    case "Unique Paths in a Grid I":
      solve_upiag1_cct(ns,contract_info)
      break
    case "Unique Paths in a Grid II":
      solve_upiag2_cct(ns, contract_info)
      break
    case "Shortest Path in a Grid":
      solve_spiag_cct(ns, contract_info)
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
      solve_e1cc_cct(ns, contract_info)
      break
    case "Encryption II: Vigenère Cipher":
      solve_e2vc_cct(ns, contract_info)
      break
  }
}