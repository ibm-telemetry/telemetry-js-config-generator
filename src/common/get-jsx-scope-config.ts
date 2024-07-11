/*
 * Copyright IBM Corp. 2024, 2024
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */
import childProcess from 'node:child_process'
import fs from 'node:fs'

import { tmpNameSync } from 'tmp-promise'
import yaml, { type Node } from 'yaml'

import { CompData, CompPropTypes, EnumValue, PropData } from '../interfaces.js'

/**
 * Creates a project-specific JSX scope configuration to be placed inside telemetry config file.
 *
 * @param files - List of files to scan for JSX Scope attributes,
 * can be an array of path(s) or glob(s).
 * @param ignore - Files to ignore when scanning for JSX Scope attributes, in glob(s) form.
 * @param doc - Yaml.document object containing current configuration.
 * @returns JSX scope configuration containing element attribute and values
 *  as determined by the supplied files.
 */
export async function getJsxScopeConfig(
  files: string[],
  ignore: string[] | undefined,
  doc: yaml.Document
) {
  const outputFilePath = await generateComponentData(files, ignore)

  if (!fs.existsSync(outputFilePath)) {
    console.error('No react-docgen file was generated for these settings')
    return null
  } else {
    const data = fs.readFileSync(outputFilePath, 'utf-8')

    const rawData: Record<string, CompData[]> = JSON.parse(data)

    const compPropTypes = parseCompData(rawData)

    const [names, values] = await getAttributeNameAndValues(compPropTypes, doc)

    fs.unlinkSync(outputFilePath)

    return {
      elements: {
        allowedAttributeNames: names,
        allowedAttributeStringValues: values
      }
    }
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
  const date = new Date().toISOString()
  const outputFilePath = tmpNameSync({
    template: `ibmtelemetry-config-${date.replace(/[:.-]/g, '')}-XXXXXX.json`
  })
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
 * Retrieves the string value from a prop data node obtained from @react-docgen/cli run.
 *
 * @param val - Object to extract string value from.
 * @returns Retrieved string value.
 */
function retrieveStringValue(val: EnumValue) {
  if (val.computed) {
    return
  }
  let sanitizedVal
  // fix for "'top'" double quotation issue
  if (
    (val.value.startsWith("'") && val.value.endsWith("'")) ||
    (val.value.startsWith('"') && val.value.endsWith('"'))
  ) {
    sanitizedVal = val.value.substring(1, val.value.length - 1)
  } else {
    sanitizedVal = val.value
  }

  return sanitizedVal
}

/**
 * Extracts prop values array from a supplied PropData object.
 *
 * @param propData - Raw prop data.
 * @returns Prop values as a string array.
 */
function getPropValues(propData: PropData): string[] {
  const values: string[] = []
  if (propData.type?.name === 'enum' && Array.isArray(propData.type.value)) {
    propData.type.value.forEach((val: EnumValue) => {
      const sanitizedVal = retrieveStringValue(val)
      if (sanitizedVal !== undefined && sanitizedVal !== '') {
        values.push(sanitizedVal)
      }
    })
  } else if (propData.type?.name === 'union' && Array.isArray(propData.type.value)) {
    propData.type.value
      .filter((nested) => nested.name === 'enum' && Array.isArray(nested.value))
      .forEach((nested) => {
        nested.value?.forEach((val: EnumValue) => {
          const sanitizedVal = retrieveStringValue(val)
          if (sanitizedVal !== undefined && sanitizedVal !== '') {
            values.push(sanitizedVal)
          }
        })
      })
  } else if (propData.tsType?.name === 'union' && Array.isArray(propData.tsType.elements)) {
    propData.tsType.elements.forEach((el) => {
      // fix for "'top'" double quotation issue

      if (el.name === 'literal') {
        const sanitizedVal = retrieveStringValue({ value: el.value, computed: false })
        if (sanitizedVal !== undefined && sanitizedVal !== '') {
          values.push(sanitizedVal)
        }
      }
    })
  }
  return values
}

/**
 * Populates the supplied `partialCompProps` object with prop data
 * parsed from the raw `compData` object.
 *
 * @param compData - Raw component data.
 * @param partialCompProps - State tracker object of previously computed props
 * for supplied component.
 * @returns Populated partialCompProps object.
 */
function addCompProps(
  compData: CompData,
  partialCompProps: Record<string, string[]>
): Record<string, string[]> {
  if (compData.props) {
    Object.entries(compData.props).forEach(([name, propData]) => {
      const propValues = [...getPropValues(propData), ...(partialCompProps[name] ?? [])]
      // remove duplicates and sort
      partialCompProps[name] = propValues
        .filter((value, index) => propValues.indexOf(value) === index)
        .sort((a, b) => a.localeCompare(b))
    })
  }
  // sort comp props
  const orderedPropKeys = Object.keys(partialCompProps).sort((a, b) => a.localeCompare(b))
  return orderedPropKeys.reduce<Record<string, string[]>>((obj, key) => {
    const data = partialCompProps[key]
    if (data) {
      obj[key] = data
    }
    return obj
  }, {})
}

/**
 * Given a CompPropTypes object, groups common prop types into a general category.
 *
 * @param compPropTypes - Previously processed component prop types,
 * ordered by component name and prop type key.
 * @returns CompPropTypes object containing general category.
 */
function groupGeneralProps(compPropTypes: CompPropTypes) {
  const general: Record<string, string[]> = {}
  // add General category
  const allCompPropTypes: CompPropTypes = {
    General: general,
    ...compPropTypes
  }

  // Compute General Props
  Object.entries(compPropTypes).forEach(([key, value]) => {
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
 * Parses the raw components data obtained from a `generateConfigFile` into a
 * comprehensible CompPropTypes object.
 *
 * @param rawData - Raw components data.
 * @returns Parsed CompPropTypes object.
 */
function parseCompData(rawData: Record<string, CompData[]>): CompPropTypes {
  const compPropTypes: CompPropTypes = {}
  Object.values(rawData).forEach((file: CompData[]) => {
    file.forEach((comp) => {
      compPropTypes[comp.displayName] = addCompProps(comp, compPropTypes[comp.displayName] ?? {})
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

  return groupGeneralProps(orderedCompPropTypes)
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
      const orderedProps = Object.entries(props).sort((a, b) => a[0].localeCompare(b[0]))
      orderedProps.forEach(([propKey, args], index) => {
        args.sort((a, b) => a.localeCompare(b))
        const propNode = doc.createNode(propKey)
        names.push(propNode)
        if (index === 0) {
          propNode.commentBefore = ` ${comp}`
        }
        args.forEach((argVal: unknown, index) => {
          if (typeof argVal === 'string') {
            const propValNode = doc.createNode(argVal)
            if (index === 0) {
              propValNode.commentBefore = ` ${comp} - ${propKey}`
            }
            values.push(propValNode)
          }
        })
      })
    })

    // add React props
    const reactKeyNode = doc.createNode('key')
    reactKeyNode.commentBefore = ' React'
    names.push(reactKeyNode)
    names.push('ref')
    return [names, values]
  } catch (e) {
    console.error('Error parsing output json data: ', e)
    return [[], []]
  }
}
