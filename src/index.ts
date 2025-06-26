#!/usr/bin/env node
/*
 * Copyright IBM Corp. 2024, 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { Command } from 'commander'

import { buildGenerateCommand } from './commands/generate.js'
import { buildJsCommand } from './commands/js.js'
import { buildJsxCommand } from './commands/jsx.js'
import { buildNpmCommand } from './commands/npm.js'
import { buildUpdateCommand } from './commands/update.js'

async function main() {
  const program = new Command()
    .configureHelp({ helpWidth: 100 })
    .addCommand(buildGenerateCommand())
    .addCommand(buildUpdateCommand())
    .addCommand(buildNpmCommand())
    .addCommand(buildJsCommand())
    .addCommand(buildJsxCommand())

  try {
    await program.parseAsync()
  } catch (err) {
    // As a failsafe, this catches any uncaught exception, prints it to stderr, and silently exits
    console.error(err)
  }
}

await main()
