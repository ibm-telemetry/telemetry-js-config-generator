/*
 * Copyright IBM Corp. 2023, 2023
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */
import childProcess from 'node:child_process'
import fs from 'node:fs'

import { Command, InvalidArgumentError } from 'commander'

interface CommandLineOptions {
  files?: string[]
  id: string
  filePath: string
  npm: boolean
  jsx: boolean
  ignore?: string[]
}

interface EnumType {
  name: 'enum'
  value: Array<{ value: string }>
}

interface UnionType {
  name: 'union'
  value: Array<PropData['type']>
}

interface PropData {
  type: EnumType | UnionType
}

interface CompData {
  displayName: keyof CompPropTypes
  props?: Record<string, PropData>
}

type CompPropTypes = Record<string, Record<string, string[]>>

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
 * This is the main entrypoint for telemetry collection.
 *
 * @param opts - The command line options provided when the program was executed.
 */
async function generateConfigFile(opts: CommandLineOptions) {
  if (opts.jsx && !opts.files) {
    throw new InvalidArgumentError('--files argument must be specified for JSX scope generation')
  }

  const endpoint =
    'https://collector-prod.1am6wm210aow.us-south.codeengine.appdomain.cloud/v1/metrics'
  const version = 1
  const ymlLanguage =
    '# yaml-language-server: $schema=https://unpkg.com/@ibm/telemetry-config-schema@v1/dist/config.schema.json'

  let jsxScope = ''
  let npmScope = ''

  if (opts.jsx && opts.files) {
    const [names, values] = await getAttributeNameAndValues(opts.files, opts.ignore)
    const allowedAttributeNames = `\n      allowedAttributeNames:\n${names}`
    const allowedAttributeStringValues = values
      ? `      allowedAttributeStringValues:\n${values}`
      : ''
    jsxScope = `\n  jsx:\n    elements:${allowedAttributeNames}${allowedAttributeStringValues}`
  }

  if (opts.npm) {
    npmScope = '\n  npm:\n    dependencies: null'
  }

  const lines = `${ymlLanguage}
version: ${version}
projectId: "${opts.id}"
endpoint: "${endpoint}"
collect:${npmScope}${jsxScope}`

  try {
    fs.writeFileSync(opts.filePath, lines)
    // file written successfully
  } catch (err) {
    console.error('Error writing to file: ', err)
  }

  fs.unlinkSync('output.json')
}

async function getAttributeNameAndValues(
  files: string[],
  ignore: string[] = []
): Promise<[string, string]> {
  let errorData = ''
  const outputFilePath = 'output.json'
  const promise = new Promise<void>((resolve, reject) => {
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
        resolve()
      }
    })
  })

  await promise

  if (!fs.existsSync(outputFilePath)) {
    console.error('No react-docgen file was generated for these settings')
    return ['', '']
  }

  const data = fs.readFileSync(outputFilePath, 'utf-8')
  try {
    const parsedData: Record<string, CompData[]> = JSON.parse(data)

    const compPropTypes: CompPropTypes = {}
    Object.values(parsedData).forEach((file: CompData[]) => {
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
            props[name] = prop.filter((value, index) => prop.indexOf(value) === index).sort()
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

    let names = ''
    let values = ''

    Object.entries(allCompPropTypes).forEach(([comp, props]) => {
      if (Object.entries(props).length) {
        names += `        # ${comp}\n`
        const propKeys = Object.keys(props).sort((a, b) => a.localeCompare(b))
        propKeys.forEach((propKey) => {
          const args: unknown[] = props[propKey]?.sort() ?? []
          names += `        - '${propKey}'\n`
          if (args.some((propArg: unknown) => typeof propArg === 'string')) {
            values += `        # ${comp} - ${propKey}\n`
            args.forEach((argVal: unknown) => {
              if (typeof argVal === 'string') {
                values += `        - '${argVal}'\n`
              }
            })
          }
        })
      }
    })

    // add React props
    names += '        # React\n'
    names += "        - 'key'\n"
    names += "        - 'ref'\n"
    return [names, values]
  } catch (e) {
    console.error('Error parsing output.json data: ', e)
    return ['', '']
  }
}

run()
