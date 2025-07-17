#!/usr/bin/env node
/*
 * Copyright IBM Corp. 2024, 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Command } from 'commander'

import { readConfigFile } from '../common/read-config-file.js'
import { updateJsConfig } from '../common/update-js-config.js'
import { updateJsxConfig } from '../common/update-jsx-config.js'
import { updateNpmConfig } from '../common/update-npm-config.js'
import { updateWcConfig } from '../common/update-wc-config.js'
import { writeConfigFile } from '../common/write-config-file.js'
import { type CommandLineOptions } from '../interfaces.js'

function buildUpdateCommand() {
  return new Command('update')
    .description('Modify in whole or part an existing telemetry config file')
    .requiredOption(
      '--scopes <scopes..>',
      'List of scopes to include in config generation. Valid scopes are "js", "jsx", "npm", and "wc". "jsx" and "wc" cannot be included together.'
    )
    .option('--id <project-id>', 'Project Id, should be obtained from the IBM Telemetry team')
    .option(
      '--endpoint <endpoint>',
      'URL of an OpenTelemetry-compatible metrics collector API endpoint. Used to post collected telemetry data to.'
    )
    .option(
      '-f, --files <files...>',
      'Files to scan for component attributes. Can be an array of path(s) or glob(s). Required for JSX and Web Component scopes.'
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
    .action((opts) => updateConfigFile(opts))
}

/**
 * Regenerates in part of whole a telemetry configuration within an existing config file.
 *
 * @param opts - The command line options provided when the command was executed.
 */
async function updateConfigFile(
  opts: Partial<CommandLineOptions> & Pick<CommandLineOptions, 'filePath'>
) {
  const configFile = readConfigFile(opts.filePath)
  const jsScope = opts.scopes?.includes('js')
  const jsxScope = opts.scopes?.includes('jsx')
  const npmScope = opts.scopes?.includes('npm')
  const wcScope = opts.scopes?.includes('wc')

  // get returns unknown and can't figure out what the type cast is supposed to be
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- unsure what the type cast is
  const collectNode = configFile.get('collect') as any

  if (collectNode === undefined || collectNode === null) {
    console.error('Existing config file is misconfigured. Please generate a new one.')
    return
  }

  if (npmScope && collectNode.get('npm') !== undefined) {
    updateNpmConfig(collectNode)
  }

  if (jsScope && collectNode.get('js') !== undefined) {
    updateJsConfig(collectNode)
  }

  if (jsxScope && collectNode.get('jsx') !== undefined) {
    if (!opts.files) {
      console.warn('Warning: skipping JSX scope regeneration, --files argument not set')
    } else {
      await updateJsxConfig(collectNode, opts.files, opts.ignore, configFile)
    }
  }

  if (wcScope && collectNode.get('wc') !== undefined) {
    if (!opts.files) {
      console.warn('Warning: skipping Web Component scope regeneration, --files argument not set')
    } else {
      await updateWcConfig(collectNode, opts.files, configFile)
    }
  }

  if (opts.id !== null && opts.id !== undefined) {
    configFile.set('projectId', opts.id)
  }

  if (opts.endpoint !== null && opts.endpoint !== undefined) {
    configFile.set('endpoint', opts.endpoint)
  }

  configFile.set('collect', collectNode)

  writeConfigFile(opts.filePath, configFile.toString())
}

export { buildUpdateCommand }
