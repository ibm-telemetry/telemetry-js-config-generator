/*
 * Copyright IBM Corp. 2025, 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { InvalidArgumentError } from 'commander'
import yaml from 'yaml'

import { getWcScopeConfig } from './get-wc-scope-config.js'

/**
 * Updates the Web Component scope configuration within an existing `collect` node.
 *
 * @param collectNode - Collect node extracted from a yaml.Document containing
 * an existing telemetry configuration.
 * @param files - Files to scan for Web Component Scope attributes,
 * can be an array of path(s) or glob(s).
 * @param configFile - Yaml.document object containing current configuration.
 */
export async function updateWcConfig(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- unsure what the type cast is
  collectNode: any,
  files: string[] | undefined,
  configFile: yaml.Document
) {
  if (!files) {
    throw new InvalidArgumentError(
      '--files argument must be specified for Web Component scope generation'
    )
  }
  collectNode.set('wc', await getWcScopeConfig(files, configFile))
}
