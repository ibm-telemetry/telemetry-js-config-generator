/*
 * Copyright IBM Corp. 2023, 2024
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */
import childProcess from 'node:child_process'
import fs from 'node:fs'

import { Command, InvalidArgumentError } from 'commander'
import yaml, { type Node } from 'yaml'

import { type CommandLineOptions, type CompData, type CompPropTypes, type EnumType } from './interfaces.js'

/**
 * Sets up Commander, registers the command action, and invokes the action.
 */
function run() {
  const program = new Command()
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
      'List of files to scan for JSX Scope attributes, can be an array of path(s) or glob(s). Required to generate JSX scope options'
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
    .action(generateConfigFile)

  program.parseAsync().catch((err) => {
    // As a failsafe, this catches any uncaught exception, prints it to stderr, and silently exits
    console.error(err)
  })
}

/**
 * Generates telemetry.yml config file based on input parameters.
 *
 * @param opts - The command line options provided when the program was executed.
 */
async function generateConfigFile(opts: CommandLineOptions) {
  if (opts.jsx && !opts.files) {
    throw new InvalidArgumentError('--files argument must be specified for JSX scope generation')
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
    const outputFilePath = await generateComponentData(opts.files, opts.ignore)

    if (!fs.existsSync(outputFilePath)) {
      console.error('No react-docgen file was generated for these settings')
    } else {
      const data = fs.readFileSync(outputFilePath, 'utf-8')

      const rawData: Record<string, CompData[]> = JSON.parse(data)

      const compPropTypes = parseCompData(rawData)

      const [names, values] = await getAttributeNameAndValues(compPropTypes, doc)
      collect['jsx'] = {
        elements: {
          allowedAttributeNames: names,
          allowedAttributeStringValues: values
        }
      }

      fs.unlinkSync(outputFilePath)
    }
  }

  if (opts.npm) {
    collect['npm'] = { dependencies: null }
  }

  doc.set('collect', collect)

  try {
    fs.writeFileSync(opts.filePath, doc.toString())
    // file written successfully
  } catch (err) {
    console.error('Error writing to file: ', err)
  }
}

/**
 * This is the main entrypoint for telemetry collection.
 *
 * @param files - List of files to generate component data for.
 * @param ignore - Files to ignore when scanning.
 * @returns A promise that resolves to the path of output file containing generated data.
 */
async function generateComponentData(files: string[], ignore: string[] = []): Promise<string> {
  let errorData = ''
  const outputFilePath = 'output.json'
  return await new Promise<string>((resolve, reject) => {
    const ignoreString = ignore.map((glob) => `--ignore "${glob}"`).join(' ')
    const proc = childProcess.spawn(
      // eslint-disable-next-line max-len -- long command
      `npx @react-docgen/cli -o ${outputFilePath} ${files.join(
        ' '
      )} --resolver find-all-exported-components ${ignoreString}`,
      { shell: true }
    )

    proc.stderr?.on('data', (data) => {
      errorData += data.toString()
    })

    proc.on('error', (err) => {
      console.error('Error: ', err)
      reject(err)
    })

    proc.on('close', (exitCode) => {
      if (exitCode !== 0) {
        console.error('Error: ', errorData)
        reject(new Error(errorData))
      } else {
        resolve(outputFilePath)
      }
    })
  })
}

/**
 * Parses the raw component data obtained from a `generateConfigFile` into a
 * comprehensible CompPropTypes object.
 *
 * @param rawData - Raw component data.
 * @returns Parsed CompPropTypes object.
 */
function parseCompData(rawData: Record<string, CompData[]>): CompPropTypes {
  const compPropTypes: CompPropTypes = {}
  Object.values(rawData).forEach((file: CompData[]) => {
    file.forEach((comp) => {
      compPropTypes[comp.displayName] = compPropTypes[comp.displayName] ?? {}
      const props = compPropTypes[comp.displayName]
      if (!props) {
        // never true, but typescript
        return
      }
      if (comp.props) {
        Object.entries(comp.props).forEach(([name, info]) => {
          props[name] = props[name] ?? []
          const prop = props[name]
          if (!prop) {
            // never true, but typescript
            return
          }
          if (info.type?.name === 'enum' && Array.isArray(info.type.value)) {
            info.type.value.forEach((val) => {
              // fix for "'top'" double quotation issue
              if (val.value.startsWith("'") && val.value.endsWith("'")) {
                prop.push(val.value.substring(1, val.value.length - 1))
              } else {
                prop.push(val.value)
              }
            })
          } else if (
            info.type?.name === 'union' &&
            Array.isArray(info.type.value) &&
            info.type.value?.some((nested) => nested.name === 'enum')
          ) {
            info.type.value
              .filter((nested) => nested.name === 'enum' && Array.isArray(nested.value))
              .forEach((nested) => {
                ;(nested as EnumType).value?.forEach((val) => {
                  // fix for "'top'" double quotation issue
                  if (val.value.startsWith("'") && val.value.endsWith("'")) {
                    prop.push(val.value.substring(1, val.value.length - 1))
                  } else {
                    prop.push(val.value)
                  }
                })
              })
          }
          // remove duplicates and sort
          props[name] = prop
            .filter((value, index) => prop.indexOf(value) === index)
            .sort((a, b) => a.localeCompare(b))
        })
      }
      // sort comp props
      const orderedPropKeys = Object.keys(props).sort((a, b) => a.localeCompare(b))
      compPropTypes[comp.displayName] = orderedPropKeys.reduce<Record<string, string[]>>(
        (obj, key) => {
          const data = props[key]
          if (data) {
            obj[key] = data
          }
          return obj
        },
        {}
      )
    })
  })
  // sort by component names
  const orderedCompPropTypesKeys = Object.keys(compPropTypes).sort((a, b) => a.localeCompare(b))

  const orderedCompPropTypes = orderedCompPropTypesKeys.reduce<CompPropTypes>((obj, key) => {
    const data = compPropTypes[key]
    if (data) {
      obj[key] = data
    }
    return obj
  }, {})

  const general: Record<string, string[]> = {}
  // add General category
  const allCompPropTypes: CompPropTypes = {
    General: general,
    ...orderedCompPropTypes
  }

  // Compute General Props
  Object.entries(allCompPropTypes).forEach(([key, value]) => {
    Object.keys(value).forEach((prop) => {
      const hasDuplicate: boolean =
        general[prop] !== undefined ||
        Object.entries(allCompPropTypes).some(
          ([duplKey, duplValue]) =>
            duplKey !== key && Object.keys(duplValue).some((duplProp) => duplProp === prop)
        )
      if (hasDuplicate) {
        const generalProp = general[prop]
        if (generalProp) {
          generalProp.push(...(value[prop] ?? []))
        } else {
          general[prop] = [...(value[prop] ?? [])]
        }
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- need to do this
        delete value[prop]
        // always true, but TypeScript...
        if (generalProp) {
          // remove duplicates
          general[prop] = generalProp.filter((val, index) => generalProp.indexOf(val) === index)
        }
      }
    })
  })

  return allCompPropTypes
}

/**
 * Constructs yaml node array of names and values given a CompPropTypes object.
 *
 * @param compPropTypes - Component prop types data.
 * @param doc - Yaml Document to attach nodes to.
 * @returns Promise containing two arrays, [names, values].
 */
async function getAttributeNameAndValues(
  compPropTypes: CompPropTypes,
  doc: yaml.Document
): Promise<[Array<Node | string>, Array<Node | string>]> {
  try {
    const names: Array<Node | string> = []
    const values: Array<Node | string> = []

    Object.entries(compPropTypes).forEach(([comp, props]) => {
      if (Object.entries(props).length) {
        const propKeys = Object.keys(props).sort((a, b) => a.localeCompare(b))
        propKeys.forEach((propKey, index) => {
          const args: unknown[] = props[propKey]?.sort() ?? []
          const propNode = doc.createNode(propKey)
          names.push(propNode)
          if (index === 0) {
            propNode.commentBefore = ` ${comp}`
          }
          if (args.some((propArg: unknown) => typeof propArg === 'string')) {
            args.forEach((argVal: unknown, index) => {
              if (typeof argVal === 'string') {
                const propValNode = doc.createNode(argVal)
                if (index === 0) {
                  propValNode.commentBefore = ` ${comp} - ${propKey}`
                }
                values.push(propValNode)
              }
            })
          }
        })
      }
    })

    // add React props
    const reactKeyNode = doc.createNode('key')
    reactKeyNode.commentBefore = ' React'
    names.push(reactKeyNode)
    names.push('ref')
    return [names, values]
  } catch (e) {
    console.error('Error parsing output.json data: ', e)
    return [[], []]
  }
}

run()
