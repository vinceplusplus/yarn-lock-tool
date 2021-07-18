import yargs from 'yargs'

import { validDedupeResolutionsTypes, validListWithDependencyPathsFromTypes } from '../types/types'
import type {
  DedupeJustParams,
  DedupeParams,
  ListParams,
  ListWithDependencyPathsParams,
  ParamsContainer,
} from './types'

export const parseCLIParams = (
  args: string[],
  suppressesExitingProcess = false,
): ParamsContainer | null => {
  let paramsContainer: ParamsContainer | null = null

  yargs
    .exitProcess(!suppressesExitingProcess)
    .usage('$0 <command> \n\n`yarn.lock` tool to analyze and deduplicate dependencies')
    .strict()
    .command(
      'dedupe',
      'deduplicate dependencies',
      (yargs) => {
        return yargs
          .option('resolutions', {
            choices: Object.keys(validDedupeResolutionsTypes),
            default: 'all',
          })
          .option('skirmishes', {
            boolean: true,
            default: false,
          })
          .help()
      },
      (argv) => {
        paramsContainer = {
          type: 'dedupe',
          params: argv as DedupeParams,
        }
      },
    )
    .command(
      'dedupeJust [dependency]',
      'deduplicate a dependency under a certain package name',
      (yargs) => {
        return yargs
          .positional('dependency', {
            describe: 'e.g. package-name, package-name@^1.0.0, or package-name@^1.0.0=>1.2.3',
            default: null,
          })
          .help()
      },
      (argv) => {
        paramsContainer = {
          type: 'dedupeJust',
          params: argv as DedupeJustParams,
        }
      },
    )
    .command(
      'list',
      'list dependencies',
      (yargs) => {
        return yargs
          .option('depth', {
            number: true,
            default: null,
          })
          .option('maxArrayLength', {
            number: true,
            default: null,
            describe: 'if some arrays are too long, set to a certain number to limit, e.g. 5',
          })
          .option('showsHavingMultipleVersionsOnly', {
            boolean: true,
            default: false,
          })
          .option('sortsByResolvedVersionCount', {
            boolean: true,
            default: false,
          })
          .option('showsAsJSON', {
            boolean: true,
            default: false,
            describe: 'output as JSON, `depth` and `maxArrayLength` will not affect output',
          })
          .help()
      },
      (argv) => {
        paramsContainer = {
          type: 'list',
          params: argv as ListParams,
        }
      },
    )
    .command(
      'listWithDependencyPaths',
      'list dependencies with dependency paths',
      (yargs) => {
        return yargs
          .option('depth', {
            number: true,
            default: null,
          })
          .option('maxArrayLength', {
            number: true,
            default: null,
            describe: 'if some arrays are too long, set to a certain number to limit, e.g. 5',
          })
          .option('sources', {
            choices: Object.keys(validListWithDependencyPathsFromTypes),
            default: 'dependencies',
          })
          .option('filtersBySources', {
            boolean: true,
            default: false,
          })
          .option('sortsByDepth', {
            boolean: true,
            default: false,
          })
          .option('showsDuplicatedOnly', {
            boolean: true,
            default: false,
          })
          .option('showsAsJSON', {
            boolean: true,
            default: false,
            describe: 'output as JSON, `depth` and `maxArrayLength` will not affect output',
          })
          .help()
      },
      (argv) => {
        paramsContainer = {
          type: 'listWithDependencyPaths',
          params: argv as ListWithDependencyPathsParams,
        }
      },
    )
    .demandCommand()
    .help()
    .parse(args)

  return paramsContainer
}
