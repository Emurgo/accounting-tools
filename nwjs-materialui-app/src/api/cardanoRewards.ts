const EPOCH = {
  number: 571,
  startTime: new Date('2025-07-18T21:44:51.000Z'),
}

const SECS_PER_EPOCH = 432000


function epochStartDate(epochNumber: number): Date {
  return new Date(
    (epochNumber - EPOCH.number) * SECS_PER_EPOCH * 1000 + EPOCH.startTime.valueOf()
  )
}

function getEpochForDate(date: Date): number {
  return Math.floor((date.valueOf() - EPOCH.startTime.valueOf()) / 1000 / SECS_PER_EPOCH) + EPOCH.number
}

export function getEpochsForMonth(year: number, month: number): { first: number, last: number } {
  return {
    first: getEpochForDate(new Date(year, month - 1)) + 1,
    last: getEpochForDate(month === 12 ? new Date(year + 1, 1) : new Date(year, month)) + 1
  }
}

const API_KEY = 'mainnettssNeYQtpuod4KVg8F7SDr5kW27mb7hJ'

export async function getRewardHistory(stakeAddr: string): { epoch: number, amount: string, pool_id: string }[] {
  const resp = await fetch(
    `https://cardano-mainnet.blockfrost.io/api/v0/accounts/${stakeAddr}/rewards?order=desc`,
    {
      headers: {
        'Project_id': API_KEY
      }
    }
  )
  const data = await resp.json()
  return data
}

if (require.main === module) {
  const d572 = epochStartDate(572)
  console.log('epoch 572 start at:', d572.toISOString(), ' '.repeat(10), d572.toString())

  console.log('current epoch:', getEpochForDate(new Date()))
  console.log('2025-07-13:', getEpochForDate(new Date('2025-07-15')))

  console.log('epochs for 2025 07', getEpochsForMonth(2025, 7))

  get('stake1u8fzl8t27zq485lhwczuw64e6wtfpgpz4qxeswqhl0tmt4gqmeufv')
}
