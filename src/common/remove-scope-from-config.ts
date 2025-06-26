/*
 * Copyright IBM Corp. 2024, 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { TelemetryScope } from '../interfaces.js'
import { readConfigFile } from './read-config-file.js'
import { writeConfigFile } from './write-config-file.js'

/**
 * Removes a determined scope configuration from an existing telemetry config file..
 *
 * @param filePath - Path to existing telemetry config file.
 * @param scope - Scope to remove.
 */
export async function removeScopeFromConfig(filePath: string, scope: TelemetryScope) {
  const configFile = readConfigFile(filePath)

  // get returns unknown and can't figure out what the type cast is supposed to be
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- `get` returns unknown
  const collectNode = configFile.get('collect') as any

  if (collectNode === undefined || collectNode === null) {
    console.error('Existing config file is misconfigured. Please generate a new one.')
    return
  }

  collectNode.delete(scope)

  if (collectNode.items?.length === 0) {
    console.warn('Cannot delete scope. At least 1 scope is required')
  } else {
    writeConfigFile(filePath, configFile.toString())
  }
}
