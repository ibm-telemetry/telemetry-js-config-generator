#!/usr/bin/env node
/*
 * Copyright IBM Corp. 2023, 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Command, InvalidArgumentError } from 'commander'
import yaml from 'yaml'

import { getJsScopeConfig } from '../common/get-js-scope-config.js'
import { getJsxScopeConfig } from '../common/get-jsx-scope-config.js'
import { getNpmScopeConfig } from '../common/get-npm-scope-config.js'
import { getWcScopeConfig } from '../common/get-wc-scope-config.js'
import { writeConfigFile } from '../common/write-config-file.js'
import { type CommandLineOptions } from '../interfaces.js'

function buildGenerateCommand() {
  return new Command('generate')
    .description('Generate IBM telemetry config file.')
    .requiredOption(
      '--id <project-id>',
      'Project Id, should be obtained from the IBM Telemetry team'
    )
    .requiredOption(
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
    .option('--no-npm', 'Disables config generation for npm scope')
    .option('--no-jsx', 'Disables config generation for JSX scope')
    .option('--no-js', 'Disables config generation for JS scope')
    .option(
      '--wc',
      'Includes Web Component scope in config generation. Requires JSX scope to be disabled with --no-jsx'
    )
    .action(generateConfigFile)
}

/**
 * Generates telemetry.yml config file based on input parameters.
 *
 * @param opts - The command line options provided when the command was executed.
 */
async function generateConfigFile(opts: CommandLineOptions) {
  if (opts.jsx && opts.wc) {
    throw new InvalidArgumentError(
      'JSX scope must be disabled with --no-jsx to include Web Component scope in config generation'
    )
  }

  if ((opts.jsx || opts.wc) && !opts.files) {
    throw new InvalidArgumentError(
      '--files argument must be specified for JSX and Web Component scope generation'
    )
  }

  const doc = new yaml.Document({
    version: 1,
    projectId: opts.id,
    endpoint: opts.endpoint
  })

  doc.commentBefore =
    ' yaml-language-server: $schema=https://unpkg.com/@ibm/telemetry-config-schema@v1/dist/config.schema.json'

  // can't pull in type from ConfigSchema because using
  // allowedAttributeNames/allowedAttributeStringValues
  // as yaml.Node array to be able to preserve comments
  const collect: Record<string, unknown> = {}

  if (opts.jsx && opts.files) {
    const jsxContents = await getJsxScopeConfig(opts.files, opts.ignore, doc)
    if (jsxContents !== null) {
      collect['jsx'] = jsxContents
    }
  }

  if (opts.wc && opts.files) {
    const wcContents = await getWcScopeConfig(opts.files, doc)
    if (wcContents !== null) {
      collect['wc'] = wcContents
    }
  }

  if (opts.npm) {
    collect['npm'] = getNpmScopeConfig()
  }

  if (opts.js) {
    collect['js'] = getJsScopeConfig()
  }

  doc.set('collect', collect)

  writeConfigFile(opts.filePath, doc.toString())
}

export { buildGenerateCommand }
