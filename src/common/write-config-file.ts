/*
 * Copyright IBM Corp. 2024, 2024
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import fs from 'node:fs'

/**
 * Write a provided telemetry configuration object to a specified file.
 *
 * @param filePath - Path to write config file to.
 * @param contents - Yaml.document object containing telemetry configuration to write to file.
 */
export function writeConfigFile(filePath: string, contents: string) {
  try {
    fs.writeFileSync(filePath, contents)
    // file written successfully
  } catch (err) {
    console.error('Error writing to file: ', err)
  }
}
