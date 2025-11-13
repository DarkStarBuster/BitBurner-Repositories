function sqrt(value) {
  if (value < 2n) {
    return value;
  }

  if (value < 16n) {
    return BigInt(Math.sqrt(Number(value))|0);
  }

  let x0, x1;

  if(value < 4503599627370496n){//1n<<52n
    x1 = BigInt(Math.sqrt(Number(value))|0)-3n;
  }
  else {
    let vlen = value.toString().length;
    if (!(vlen&1)) {
      x1 = 10n**(BigInt(vlen/2));
    } else {
      x1 = 4n*10n**(BigInt((vlen/2)|0));
    }
  }


  do {
    x0 = x1;
    x1 = ((value / x0) + x0) >> 1n;
  }while((x0 !== x1 && x0 !== (x1 - 1n)));

  return x0;
}

async function check_for_m_square(ns, result) {

  let limit = sqrt(result)
  let count_triplets = 0
  let found_triplets = {}
  ns.print("Target: " + result + " Limit: " + limit)

  for (let i = 1n; i < limit; i += 1n) {
    for (let j = i + 1n; j < limit; j += 1n) {
      for (let k = limit; k > j; k -= 1n) {

        if ((i*i) + (j*j) + (k*k) == result) {
          //ns.print("SUCCESS Found triplet: " + i + ", " + j + ", " + k)
          count_triplets += 1
          found_triplets[count_triplets] = {
            "a": i,
            "b": j,
            "c": k
          }
        }
        else {
          //ns.print("ERROR Not a triplet: " + i + ", " + j + ", " + k)
        }

        if (k % 1000n == 0n) {
          await ns.sleep(10)
        }

      }
    }
  }

  function check_unique(unique_digits = {}, unique_digit_count = 0, triplet = {}) {
    let a_found = false
    let b_found = false
    let c_found = false
    for (let a = 1; a < unique_digit_count; a += 1) {
      if (unique_digits[a] == triplet.a) {
        a_found = true
      }
      if (unique_digits[a] == triplet.b) {
        b_found = true
      }
      if (unique_digits[a] == triplet.c) {
        c_found = true
      }
    }

    if (~a_found) {
      unique_digit_count += 1
      unique_digits[unique_digit_count] = triplet.a
    }
    if (~b_found) {
      unique_digit_count += 1
      unique_digits[unique_digit_count] = triplet.b
    }
    if (~c_found) {
      unique_digit_count += 1
      unique_digits[unique_digit_count] = triplet.c
    }
    return unique_digits, unique_digit_count
  }

  let success = false
  let calc_step = 0
  let last_break = 0
  let total_steps = (count_triplets)*(count_triplets-1)*(count_triplets-2)*(count_triplets-3)*(count_triplets-4)*(count_triplets-5)*(count_triplets-6)*(count_triplets-7)*(count_triplets-8)
  ns.print("Found " + count_triplets + " triplets, worst case: " + total_steps + " Steps")
  let unique_digits = {}
  let unique_digit_count = 0
  for (let i = 1; i < count_triplets - 8; i += 1) {
    for (let j = i + 1; j < count_triplets - 7; j += 1) {
      for (let k = j + 1; k < count_triplets - 6; k += 1) {
        unique_digits = {}
        unique_digit_count = 0
        unique_digits, unique_digit_count = check_unique(unique_digits, unique_digit_count, found_triplets[i])
        unique_digits, unique_digit_count = check_unique(unique_digits, unique_digit_count, found_triplets[j])
        unique_digits, unique_digit_count = check_unique(unique_digits, unique_digit_count, found_triplets[k])
        if (unique_digit_count <= 9) {
          for (let l = k + 1; l < count_triplets - 5; l += 1) {
            unique_digits = {}
            unique_digit_count = 0
            unique_digits, unique_digit_count = check_unique(unique_digits, unique_digit_count, found_triplets[i])
            unique_digits, unique_digit_count = check_unique(unique_digits, unique_digit_count, found_triplets[j])
            unique_digits, unique_digit_count = check_unique(unique_digits, unique_digit_count, found_triplets[k])
            unique_digits, unique_digit_count = check_unique(unique_digits, unique_digit_count, found_triplets[l])
            if (unique_digit_count <= 9) {
              for (let m = l + 1; m < count_triplets - 4; m += 1) {
                unique_digits = {}
                unique_digit_count = 0
                unique_digits, unique_digit_count = check_unique(unique_digits, unique_digit_count, found_triplets[i])
                unique_digits, unique_digit_count = check_unique(unique_digits, unique_digit_count, found_triplets[j])
                unique_digits, unique_digit_count = check_unique(unique_digits, unique_digit_count, found_triplets[k])
                unique_digits, unique_digit_count = check_unique(unique_digits, unique_digit_count, found_triplets[l])
                unique_digits, unique_digit_count = check_unique(unique_digits, unique_digit_count, found_triplets[m])
                if (unique_digit_count <= 9) {
                  for (let n = m + 1; n < count_triplets - 3; n += 1) {
                    unique_digits = {}
                    unique_digit_count = 0
                    unique_digits, unique_digit_count = check_unique(unique_digits, unique_digit_count, found_triplets[i])
                    unique_digits, unique_digit_count = check_unique(unique_digits, unique_digit_count, found_triplets[j])
                    unique_digits, unique_digit_count = check_unique(unique_digits, unique_digit_count, found_triplets[k])
                    unique_digits, unique_digit_count = check_unique(unique_digits, unique_digit_count, found_triplets[l])
                    unique_digits, unique_digit_count = check_unique(unique_digits, unique_digit_count, found_triplets[m])
                    unique_digits, unique_digit_count = check_unique(unique_digits, unique_digit_count, found_triplets[n])
                    if (unique_digit_count <= 9) {
                      for (let o = n + 1; o < count_triplets - 2; o += 1) {
                        unique_digits = {}
                        unique_digit_count = 0
                        unique_digits, unique_digit_count = check_unique(unique_digits, unique_digit_count, found_triplets[i])
                        unique_digits, unique_digit_count = check_unique(unique_digits, unique_digit_count, found_triplets[j])
                        unique_digits, unique_digit_count = check_unique(unique_digits, unique_digit_count, found_triplets[k])
                        unique_digits, unique_digit_count = check_unique(unique_digits, unique_digit_count, found_triplets[l])
                        unique_digits, unique_digit_count = check_unique(unique_digits, unique_digit_count, found_triplets[m])
                        unique_digits, unique_digit_count = check_unique(unique_digits, unique_digit_count, found_triplets[n])
                        unique_digits, unique_digit_count = check_unique(unique_digits, unique_digit_count, found_triplets[o])
                        if (unique_digit_count <= 9) {
                          for (let p = o + 1; p <= count_triplets - 1; p += 1) {
                            unique_digits = {}
                            unique_digit_count = 0
                            unique_digits, unique_digit_count = check_unique(unique_digits, unique_digit_count, found_triplets[i])
                            unique_digits, unique_digit_count = check_unique(unique_digits, unique_digit_count, found_triplets[j])
                            unique_digits, unique_digit_count = check_unique(unique_digits, unique_digit_count, found_triplets[k])
                            unique_digits, unique_digit_count = check_unique(unique_digits, unique_digit_count, found_triplets[l])
                            unique_digits, unique_digit_count = check_unique(unique_digits, unique_digit_count, found_triplets[m])
                            unique_digits, unique_digit_count = check_unique(unique_digits, unique_digit_count, found_triplets[n])
                            unique_digits, unique_digit_count = check_unique(unique_digits, unique_digit_count, found_triplets[o])
                            unique_digits, unique_digit_count = check_unique(unique_digits, unique_digit_count, found_triplets[p])
                            if (unique_digit_count <= 9) {
                              for (let q = p + 1; q <= count_triplets; q += 1) {
                                unique_digits = {}
                                unique_digit_count = 0
                                unique_digits, unique_digit_count = check_unique(unique_digits, unique_digit_count, found_triplets[i])
                                unique_digits, unique_digit_count = check_unique(unique_digits, unique_digit_count, found_triplets[j])
                                unique_digits, unique_digit_count = check_unique(unique_digits, unique_digit_count, found_triplets[k])
                                unique_digits, unique_digit_count = check_unique(unique_digits, unique_digit_count, found_triplets[l])
                                unique_digits, unique_digit_count = check_unique(unique_digits, unique_digit_count, found_triplets[m])
                                unique_digits, unique_digit_count = check_unique(unique_digits, unique_digit_count, found_triplets[n])
                                unique_digits, unique_digit_count = check_unique(unique_digits, unique_digit_count, found_triplets[o])
                                unique_digits, unique_digit_count = check_unique(unique_digits, unique_digit_count, found_triplets[p])
                                unique_digits, unique_digit_count = check_unique(unique_digits, unique_digit_count, found_triplets[q])

                                if (unique_digit_count <= 9) {
                                  success = true
                                  ns.print("SUCCESS Found One!")
                                  ns.write("MagicSquareResults","SUCCESS Found 9 triplets with 9 or less unique numbers", "a")
                                  ns.write("MagicSquareResults","1: " + found_triplets[i].a + ", " + found_triplets[i].b + ", " + found_triplets[i].c, "a")
                                  ns.write("MagicSquareResults","2: " + found_triplets[j].a + ", " + found_triplets[j].b + ", " + found_triplets[j].c, "a")
                                  ns.write("MagicSquareResults","3: " + found_triplets[k].a + ", " + found_triplets[k].b + ", " + found_triplets[k].c, "a")
                                  ns.write("MagicSquareResults","4: " + found_triplets[l].a + ", " + found_triplets[l].b + ", " + found_triplets[l].c, "a")
                                  ns.write("MagicSquareResults","5: " + found_triplets[m].a + ", " + found_triplets[m].b + ", " + found_triplets[m].c, "a")
                                  ns.write("MagicSquareResults","6: " + found_triplets[n].a + ", " + found_triplets[n].b + ", " + found_triplets[n].c, "a")
                                  ns.write("MagicSquareResults","7: " + found_triplets[o].a + ", " + found_triplets[o].b + ", " + found_triplets[o].c, "a")
                                  ns.write("MagicSquareResults","8: " + found_triplets[p].a + ", " + found_triplets[p].b + ", " + found_triplets[p].c, "a")
                                  ns.write("MagicSquareResults","9: " + found_triplets[q].a + ", " + found_triplets[q].b + ", " + found_triplets[q].c, "a")
                                  ns.write(filename, line, "a")
                                  await ns.sleep(300000)
                                }

                                calc_step += 1

                                if (calc_step % 100 == 0) {
                                  await ns.sleep(10)
                                }
                              }
                            }
                            else {
                              calc_step += 1
                              if (calc_step > (last_break + 1000)) {
                                last_break = calc_step
                                await ns.sleep(10)
                              }
                            }
                          }
                        }
                        else {
                          calc_step += 1
                          if (calc_step > (last_break + 1000)) {
                            last_break = calc_step
                            await ns.sleep(10)
                          }
                        }
                      }
                    }
                    else {
                      calc_step += 1
                      if (calc_step > (last_break + 1000)) {
                        last_break = calc_step
                        await ns.sleep(10)
                      }
                    }
                  }
                }
                else {
                  calc_step += 1
                  if (calc_step > (last_break + 1000)) {
                    last_break = calc_step
                    await ns.sleep(10)
                  }
                }
              }
            }
            else {
              calc_step += 1
              if (calc_step > (last_break + 1000)) {
                last_break = calc_step
                await ns.sleep(10)
              }
            }
          }
        }
        else {
          calc_step += 1
          if (calc_step > (last_break + 1000)) {
            last_break = calc_step
            await ns.sleep(10)
          }
        }        
      }
    }
  }

  ns.print("Finished with success = " + success)
}

/** @param {import("../.").NS} ns */
export async function main(ns) {
  // const UPDATE_HANDLER = ns.getPortHandle(4)

  // ns.atExit(function() {
  //   UPDATE_HANDLER.write(
  //     JSON.stringify({
  //       "action" : "request_action"
  //      ,"request_action" : {
  //         "script_action": "death_react"
  //       }
  //     })
  //   )
  // })

  // while(true) {
  //   if (ns.hacknet.numHashes() > 4) {
  //     ns.hacknet.spendHashes("Sell for Money",undefined,Math.floor(ns.hacknet.numHashes()/4))
  //   }
  //   await ns.sleep(4)
  // }

  ns.disableLog("ALL")
  ns.tail()

  

  let result = BigInt("110285602219855957930213178867713")
  // let limit = sqrt(result)
  // let result = BigInt((100*100)+(101*101)+(102*102))
  // for (let a = 1; a < 100; a += 1) {
  //   for (let b = a+1; b < 100; b += 1) {
  //     for (let c = b+1; c < 100; c += 1) {
  //       await check_for_m_square(ns, BigInt((a*a)+(b*b)+(c*c)))
  //     }
  //   }
  // }
  await check_for_m_square(ns, result)
}