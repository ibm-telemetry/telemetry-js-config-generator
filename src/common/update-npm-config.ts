/*
 * Copyright IBM Corp. 2024, 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { getNpmScopeConfig } from './get-npm-scope-config.js'

/**
 * Updates the npm scope configuration within an existing `collect` node.
 *
 * @param collectNode - Collect node extracted from a yaml.Document containing
 * an existing telemetry configuration.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- unsure what the type cast is
export function updateNpmConfig(collectNode: any) {
  collectNode.set('npm', getNpmScopeConfig())
}
