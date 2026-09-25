/*
 * Copyright IBM Corp. 2025, 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { InvalidArgumentError } from 'commander'
import yaml from 'yaml'

import { getWcScopeConfig } from './get-wc-scope-config.js'
import { mergeStringLists } from './merge-string-lists.js'

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

  const newWcConfig = await getWcScopeConfig(files, configFile)

  if (newWcConfig !== null) {
    const existingElements = collectNode.getIn(['wc', 'elements'])

    if (existingElements !== undefined && existingElements !== null) {
      // allowedAttributeStringValues: union of existing and newly-discovered
      // values so hand-curated entries are kept and new ones from source are added.
      newWcConfig.elements.allowedAttributeStringValues = mergeStringLists(
        existingElements.get('allowedAttributeStringValues'),
        newWcConfig.elements.allowedAttributeStringValues
      )

      // allowedAttributeObjectKeys: preserve only — getWcScopeConfig never
      // produces this key, so there are no new values to merge in.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- optional key
      const elements = newWcConfig.elements as Record<string, any>
      const existingObjectKeys = existingElements.get('allowedAttributeObjectKeys')
      if (existingObjectKeys !== undefined && existingObjectKeys !== null) {
        elements['allowedAttributeObjectKeys'] = existingObjectKeys
      }
    }
  }

  collectNode.set('wc', newWcConfig)
}
