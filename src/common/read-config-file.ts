/*
 * Copyright IBM Corp. 2024, 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */
import fs from 'node:fs'

import yaml from 'yaml'

/**
 * Retrieves a telemetry config object from an existing config file.
 *
 * @param filePath - Path to read telemetry config file from.
 * @returns Yaml.doc parsed document obtained from existing config file.
 */
export function readConfigFile(filePath: string) {
  const file = fs.readFileSync(filePath, 'utf8')
  return yaml.parseDocument(file)
}
