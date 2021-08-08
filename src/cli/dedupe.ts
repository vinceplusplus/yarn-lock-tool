import { deduplicateOnDirectory } from '../library'
import type { DedupeParamsContainer } from './types'

export const dedupe = async (paramsContainer: DedupeParamsContainer) => {
  const { params } = paramsContainer
  deduplicateOnDirectory({
    dirPath: '.',
    resolutions: params.resolutions,
    printsLog: true,
    skirmishes: params.skirmishes,
  })

  if (params.skirmishes) {
    return
  }

  console.log('\n')
  console.log("Don't forget to run `yarn` to clean up the ghost entries in `yarn.lock`")
}
