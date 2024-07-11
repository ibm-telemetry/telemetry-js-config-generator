#!/usr/bin/env node
/*
 * Copyright IBM Corp. 2024, 2024
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Command } from 'commander'

import { readConfigFile } from '../common/read-config-file.js'
import { removeScopeFromConfig } from '../common/remove-scope-from-config.js'
import { updateNpmConfig } from '../common/update-npm-config.js'
import { writeConfigFile } from '../common/write-config-file.js'
import { type CommandLineOptions } from '../interfaces.js'

function buildNpmCommand() {
  const npmCommand = new Command('npm').description('add, update or remove npm scope')

  npmCommand
    .command('add')
    .description('add npm scope to current config file')
    .option(
      '-p, --file-path <file-path>',
      'Path to create config file at, defaults to `telemetry.yml`',
      'telemetry.yml'
    )
    .action((opts) => updateNpmConfigInFile(opts, 'add'))

  npmCommand
    .command('update')
    .description('regenerate the npm scope')
    .option(
      '-p, --file-path <file-path>',
      'Path to create config file at, defaults to `telemetry.yml`',
      'telemetry.yml'
    )
    .action((opts) => updateNpmConfigInFile(opts, 'update'))

  npmCommand
    .command('remove')
    .description('remove npm scope from current config file')
    .option(
      '-p, --file-path <file-path>',
      'Path to create config file at, defaults to `telemetry.yml`',
      'telemetry.yml'
    )
    .action((opts) => removeScopeFromConfig(opts.filePath, 'npm'))

  return npmCommand
}

/**
 * Adds or updates the npm scope configuration within an existing config file.
 *
 * @param opts - The command line options provided when the command was executed.
 * @param action - Indicates whether the npm scope needs to be added or updated.
 */
async function updateNpmConfigInFile(
  opts: Partial<CommandLineOptions> & Pick<CommandLineOptions, 'filePath'>,
  action: 'add' | 'update'
) {
  const configFile = readConfigFile(opts.filePath)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- unsure what the type cast is
  const collectNode = configFile.get('collect') as any

  if (collectNode === undefined || collectNode === null) {
    console.error('Existing config file is misconfigured. Please generate a new one.')
    return
  }

  if (action === 'update' && collectNode.get('npm') === undefined) {
    console.error('npm scope not configured. Cannot update')
    return
  }

  updateNpmConfig(collectNode)

  configFile.set('collect', collectNode)

  writeConfigFile(opts.filePath, configFile.toString())
}

export { buildNpmCommand }
