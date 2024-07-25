/*
 * Copyright IBM Corp. 2024, 2024
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { InvalidArgumentError } from 'commander'
import yaml from 'yaml'

import { getJsxScopeConfig } from './get-jsx-scope-config.js'

/**
 * Updates the JSX scope configuration within an existing `collect` node.
 *
 * @param collectNode - Collect node extracted from a yaml.Document containing
 * an existing telemetry configuration.
 * @param files - List of files to scan for JSX Scope attributes,
 * can be an array of path(s) or glob(s).
 * @param ignore - Files to ignore when scanning for JSX Scope attributes, in glob(s) form.
 * @param configFile - Yaml.document object containing current configuration.
 */
export async function updateJsxConfig(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- unsure what the type cast is
  collectNode: any,
  files: string[] | undefined,
  ignore: string[] | undefined,
  configFile: yaml.Document
) {
  if (!files) {
    throw new InvalidArgumentError('--files argument must be specified for JSX scope generation')
  }
  collectNode.set('jsx', await getJsxScopeConfig(files, ignore, configFile))
}
