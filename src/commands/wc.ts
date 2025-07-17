#!/usr/bin/env node
/*
 * Copyright IBM Corp. 2025, 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Command } from 'commander'

import { readConfigFile } from '../common/read-config-file.js'
import { removeScopeFromConfig } from '../common/remove-scope-from-config.js'
import { updateWcConfig } from '../common/update-wc-config.js'
import { writeConfigFile } from '../common/write-config-file.js'
import { type CommandLineOptions } from '../interfaces.js'

function buildWcCommand() {
  const wcCommand = new Command('wc').description('Add, update or remove web component scope')

  wcCommand
    .command('add')
    .description('Add web component scope to current config file')
    .requiredOption(
      '-f, --files <files...>',
      'Files to scan for Web Component attributes, can be an array of path(s) or glob(s). Required to generate Web Component scope options'
    )
    .option(
      '-p, --file-path <file-path>',
      'Path to create config file at, defaults to `telemetry.yml`',
      'telemetry.yml'
    )
    .action((opts) => updateWcConfigInFile(opts, 'add'))

  wcCommand
    .command('update')
    .description('Regenerate the web component scope')
    .requiredOption(
      '-f, --files <files...>',
      'Files to scan for Web Component attributes, can be an array of path(s) or glob(s). Required to generate Web Component scope options'
    )
    .option(
      '-p, --file-path <file-path>',
      'Path to create config file at, defaults to `telemetry.yml`',
      'telemetry.yml'
    )
    .action((opts) => updateWcConfigInFile(opts, 'update'))

  wcCommand
    .command('remove')
    .description('Remove web component scope from current config file')
    .option(
      '-p, --file-path <file-path>',
      'Path to create config file at, defaults to `telemetry.yml`',
      'telemetry.yml'
    )
    .action((opts) => removeScopeFromConfig(opts.filePath, 'wc'))

  return wcCommand
}

/**
 * Adds or updates the Web Component scope configuration within an existing config file.
 *
 * @param opts - The command line options provided when the command was executed.
 * @param action - Indicates whether the Web Component scope needs to be added or updated.
 */
async function updateWcConfigInFile(
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

  if (action === 'update' && collectNode.get('wc') === undefined) {
    console.error('Web Component scope not configured. Cannot update')
    return
  }

  await updateWcConfig(collectNode, opts.files, configFile)

  configFile.set('collect', collectNode)

  writeConfigFile(opts.filePath, configFile.toString())
}

export { buildWcCommand }
