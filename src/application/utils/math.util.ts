import { create, all, type ConfigOptions } from 'mathjs'

const mathOptions: ConfigOptions = {
  precision: 64,
  number: "number"
}

const bigMathOptions: ConfigOptions = {
  precision: 64,
  number: "BigNumber"
}

export const math = create(all, mathOptions)
export const bigMath = create(all, bigMathOptions)