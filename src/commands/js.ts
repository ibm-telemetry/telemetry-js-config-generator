#!/usr/bin/env node
/*
 * Copyright IBM Corp. 2024, 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Command } from 'commander'

import { readConfigFile } from '../common/read-config-file.js'
import { removeScopeFromConfig } from '../common/remove-scope-from-config.js'
import { updateJsConfig } from '../common/update-js-config.js'
import { writeConfigFile } from '../common/write-config-file.js'
import { type CommandLineOptions } from '../interfaces.js'

function buildJsCommand() {
  const jsCommand = new Command('js').description('Add, update or remove js scope')

  jsCommand
    .command('add')
    .description('Add js scope to current config file')
    .option(
      '-p, --file-path <file-path>',
      'Path to create config file at, defaults to `telemetry.yml`',
      'telemetry.yml'
    )
    .action((opts) => updateJsConfigInFile(opts, 'add'))

  jsCommand
    .command('update')
    .description('Regenerate the js scope')
    .option(
      '-p, --file-path <file-path>',
      'Path to create config file at, defaults to `telemetry.yml`',
      'telemetry.yml'
    )
    .action((opts) => updateJsConfigInFile(opts, 'update'))

  jsCommand
    .command('remove')
    .description('Remove js scope from current config file')
    .option(
      '-p, --file-path <file-path>',
      'Path to create config file at, defaults to `telemetry.yml`',
      'telemetry.yml'
    )
    .action((opts) => removeScopeFromConfig(opts.filePath, 'js'))

  return jsCommand
}

/**
 * Adds or updates the JS scope configuration within an existing config file.
 *
 * @param opts - The command line options provided when the command was executed.
 * @param action - Indicates whether the JS scope needs to be added or updated.
 */
async function updateJsConfigInFile(
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

  if (action === 'update' && collectNode.get('js') === undefined) {
    console.error('JS scope not configured. Cannot update')
    return
  }

  updateJsConfig(collectNode)

  configFile.set('collect', collectNode)

  writeConfigFile(opts.filePath, configFile.toString())
}

export { buildJsCommand }
