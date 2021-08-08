import inquirer from 'inquirer'
import inquirerAutocompletePrompt from 'inquirer-autocomplete-prompt'
import { hideBin } from 'yargs/helpers'

import { dedupe } from './dedupe'
import { dedupeJust } from './dedupeJust'
import { list } from './list'
import { listWithDependencyPaths } from './listWithDependencyPaths'
import { parseCLIParams } from './parseCLIParams'

export const main = async () => {
  inquirer.registerPrompt('autocomplete', inquirerAutocompletePrompt)

  const paramsContainer = parseCLIParams(hideBin(process.argv))
  if (paramsContainer == null) {
    return
  }
  switch (paramsContainer.type) {
    case 'dedupe':
      await dedupe(paramsContainer)
      break
    case 'dedupeJust':
      await dedupeJust(paramsContainer)
      break
    case 'list':
      await list(paramsContainer)
      break
    case 'listWithDependencyPaths':
      await listWithDependencyPaths(paramsContainer)
      break
  }
}
