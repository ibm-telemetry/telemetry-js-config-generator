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
import { updateJsxConfig } from '../common/update-jsx-config.js'
import { writeConfigFile } from '../common/write-config-file.js'
import { type CommandLineOptions } from '../interfaces.js'

function buildJsxCommand() {
  const jsxCommand = new Command('jsx').description('add, update or remove jsx scope')

  jsxCommand
    .command('add')
    .description('add jsx scope to current config file')
    .requiredOption(
      '-f, --files <files...>',
      'List of files to scan for JSX Scope attributes, can be an array of path(s) or glob(s). Required to generate JSX scope options'
    )
    .option(
      '-i, --ignore <files...>',
      'Files to ignore when scanning for JSX Scope attributes, in glob(s) form.'
    )
    .option(
      '-p, --file-path <file-path>',
      'Path to create config file at, defaults to `telemetry.yml`',
      'telemetry.yml'
    )
    .action((opts) => updateJsxConfigInFile(opts, 'add'))

  jsxCommand
    .command('update')
    .description('regenerate the jsx scope')
    .requiredOption(
      '-f, --files <files...>',
      'List of files to scan for JSX Scope attributes, can be an array of path(s) or glob(s). Required to generate JSX scope options'
    )
    .option(
      '-i, --ignore <files...>',
      'Files to ignore when scanning for JSX Scope attributes, in glob(s) form.'
    )
    .option(
      '-p, --file-path <file-path>',
      'Path to create config file at, defaults to `telemetry.yml`',
      'telemetry.yml'
    )
    .action((opts) => updateJsxConfigInFile(opts, 'update'))

  jsxCommand
    .command('remove')
    .description('remove jsx scope from current config file')
    .option(
      '-p, --file-path <file-path>',
      'Path to create config file at, defaults to `telemetry.yml`',
      'telemetry.yml'
    )
    .action((opts) => removeScopeFromConfig(opts.filePath, 'jsx'))

  return jsxCommand
}

/**
 * Adds or updates the JSX scope configuration within an existing config file.
 *
 * @param opts - The command line options provided when the command was executed.
 * @param action - Indicates whether the JSX scope needs to be added or updated.
 */
async function updateJsxConfigInFile(
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

  if (action === 'update' && collectNode.get('jsx') === undefined) {
    console.error('JSX scope not configured. Cannot update')
    return
  }

  updateJsxConfig(collectNode, opts.files, opts.ignore, configFile)

  configFile.set('collect', collectNode)

  writeConfigFile(opts.filePath, configFile.toString())
}

export { buildJsxCommand }
