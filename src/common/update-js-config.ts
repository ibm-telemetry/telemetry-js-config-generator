/*
 * Copyright IBM Corp. 2024, 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */
// get returns unknown and can't figure out what the type cast is supposed to be

import { getJsScopeConfig } from './get-js-scope-config.js'

/**
 * Updates the JS scope configuration within an existing `collect` node.
 *
 * @param collectNode - Collect node extracted from a yaml.Document containing
 * an existing telemetry configuration.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- unsure of yaml type
export function updateJsConfig(collectNode: any) {
  collectNode.set('js', getJsScopeConfig())
}
