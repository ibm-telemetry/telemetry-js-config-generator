/*
 * Copyright IBM Corp. 2025, 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */
import childProcess from 'node:child_process'
import fs from 'node:fs'

import { tmpNameSync } from 'tmp-promise'
import yaml, { type Node } from 'yaml'

import {
  AttributeData,
  AttributeValue,
  WcaOutput,
  WebCompAttributes,
  WebCompData
} from '../interfaces.js'

/**
 * Creates a project-specific Web Component scope configuration to be placed inside telemetry
 * config file.
 *
 * @param files - List of files to scan for Web Component Scope attributes,
 * can be an array of path(s) or glob(s).
 * @param doc - Yaml.document object containing current configuration.
 * @returns Web Component scope configuration containing element attribute and values
 *  as determined by the supplied files.
 */
export async function getWcScopeConfig(files: string[], doc: yaml.Document) {
  const outputFilePath = await generateComponentData(files)

  if (!fs.existsSync(outputFilePath)) {
    console.error('No web-component-analyzer file was generated for these settings')
    return null
  } else {
    const data = fs.readFileSync(outputFilePath, 'utf-8')

    const rawData: WcaOutput = JSON.parse(data)

    const webCompAttributes = parseCompData(rawData)

    const [names, values] = await getAttributeNameAndValues(webCompAttributes, doc)

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
 * @returns A promise that resolves to the path of output file containing generated data.
 */
async function generateComponentData(files: string[]): Promise<string> {
  let errorData = ''
  const date = new Date().toISOString()
  const outputFilePath = tmpNameSync({
    template: `ibmtelemetry-config-${date.replace(/[:.-]/g, '')}-XXXXXX.json`
  })
  return await new Promise<string>((resolve, reject) => {
    const proc = childProcess.spawn(
      // eslint-disable-next-line max-len -- long command
      `npx web-component-analyzer analyze  --format vscode --outFile ${outputFilePath}`,
      files,
      { shell: true }
    )

    proc.stderr?.on('data', (data) => {
      errorData += data.toString()
    })

    proc.on('error', (err) => {
      console.error('Error: ', err)
      reject(err as Error)
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
 * Extracts attribute values array from a supplied AttributeData object.
 *
 * @param attributeData - Raw attribute data.
 * @returns Attribute values as a string array.
 */
function getAttributeValues(attributeData: AttributeData): string[] {
  const values: string[] = []
  if (attributeData.values) {
    attributeData.values.forEach((val: AttributeValue) => values.push(val.name))
  }
  return values
}

/**
 * Populates the supplied `partialCompAttributes` object with attribute data
 * parsed from the raw `compData` object.
 *
 * @param compData - Raw component data.
 * @param partialCompAttributes - State tracker object of previously computed attributes
 * for supplied component.
 * @returns Populated partialCompAttributes object.
 */
function addCompAttributes(
  compData: WebCompData,
  partialCompAttributes: Record<string, string[]>
): Record<string, string[]> {
  if (compData.attributes) {
    compData.attributes.forEach((attr) => {
      const attributeValues = [
        ...getAttributeValues(attr),
        ...(partialCompAttributes[attr.name] ?? [])
      ]
      // remove duplicates and sort attribute values
      partialCompAttributes[attr.name] = attributeValues
        .filter((value, index) => attributeValues.indexOf(value) === index)
        .sort((a, b) => a.localeCompare(b))
    })
  }
  // sort comp attributes by names
  const orderedAttributeKeys = Object.keys(partialCompAttributes).sort((a, b) => a.localeCompare(b))
  return orderedAttributeKeys.reduce<Record<string, string[]>>((obj, key) => {
    const data = partialCompAttributes[key]
    if (data) {
      obj[key] = data
    }
    return obj
  }, {})
}

/**
 * Given a WebCompAttributes object, groups common attributes into a general category.
 *
 * @param webCompAttributes - Previously processed component attributes data,
 * ordered by component name and attribute key.
 * @returns WebCompAttributes object containing general category.
 */
function groupGeneralAttributes(webCompAttributes: WebCompAttributes) {
  const general: Record<string, string[]> = {}
  // add General category
  const allCompAttributes: WebCompAttributes = {
    General: general,
    ...webCompAttributes
  }

  /**
   * Helper function that checks if a given attribute exists in another component than the one
   * provided.
   *
   * @param component - Name of the component that has the provided attribute.
   * @param attr - The attribute name to check for duplicates.
   * @returns Boolean value representing whether the attribute has at least one duplicate.
   */
  function checkDuplicates(component: string, attr: string) {
    if (general[attr] !== undefined) {
      return true
    }
    return Object.entries(allCompAttributes).some(
      ([duplKey, duplValue]) =>
        duplKey !== component && Object.keys(duplValue).some((duplAttr) => duplAttr === attr)
    )
  }

  // Compute General Attributes
  Object.entries(webCompAttributes).forEach(([key, value]) => {
    Object.keys(value).forEach((attr) => {
      const hasDuplicate: boolean = checkDuplicates(key, attr)
      if (hasDuplicate) {
        const generalAttribute = general[attr]
        if (generalAttribute) {
          generalAttribute.push(...(value[attr] ?? []))
        } else {
          general[attr] = [...(value[attr] ?? [])]
        }
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- need to do this
        delete value[attr]
        // always true, but TypeScript...
        if (generalAttribute) {
          // remove duplicates
          general[attr] = generalAttribute.filter(
            (val, index) => generalAttribute.indexOf(val) === index
          )
        }
      }
    })
  })

  return allCompAttributes
}

/**
 * Parses the raw components data obtained from a `generateConfigFile` into a
 * comprehensible WebCompAttributes object.
 *
 * @param rawData - Raw components data.
 * @returns Parsed WebCompAttributes object.
 */
function parseCompData(rawData: WcaOutput): WebCompAttributes {
  const webCompAttributes: WebCompAttributes = {}
  rawData.tags.forEach((component: WebCompData) => {
    webCompAttributes[component.name] = addCompAttributes(
      component,
      webCompAttributes[component.name] ?? {}
    )
  })
  // sort by component names
  const orderedCompAttributeKeys = Object.keys(webCompAttributes).sort((a, b) => a.localeCompare(b))

  const orderedCompAttributes = orderedCompAttributeKeys.reduce<WebCompAttributes>((obj, key) => {
    const data = webCompAttributes[key]
    if (data) {
      obj[key] = data
    }
    return obj
  }, {})

  return groupGeneralAttributes(orderedCompAttributes)
}

/**
 * Constructs yaml node array of names and values given a WebCompAttributes object.
 *
 * @param webCompAttributes - Component attributes data.
 * @param doc - Yaml Document to attach nodes to.
 * @returns Promise containing two arrays, [names, values].
 */
async function getAttributeNameAndValues(
  webCompAttributes: WebCompAttributes,
  doc: yaml.Document
): Promise<[Array<Node | string>, Array<Node | string>]> {
  try {
    const names: Array<Node | string> = []
    const values: Array<Node | string> = []

    Object.entries(webCompAttributes).forEach(([comp, attributes]) => {
      const orderedCompAttributes = Object.entries(attributes).sort((a, b) =>
        a[0].localeCompare(b[0])
      )
      orderedCompAttributes.forEach(([attrKey, attrValues], index) => {
        attrValues.sort((a, b) => a.localeCompare(b))
        const attrNode = doc.createNode(attrKey)
        names.push(attrNode)
        if (index === 0) {
          attrNode.commentBefore = ` ${comp}`
        }
        attrValues.forEach((val: unknown, index) => {
          if (typeof val === 'string') {
            const attrValNode = doc.createNode(val)
            if (index === 0) {
              attrValNode.commentBefore = ` ${comp} - ${attrKey}`
            }
            values.push(attrValNode)
          }
        })
      })
    })

    // add boolean attribute values
    const booleanTrueNode = doc.createNode('true')
    booleanTrueNode.commentBefore = ' General - boolean attributes'
    values.unshift(booleanTrueNode, 'false')
    return [names, values]
  } catch (e) {
    console.error('Error parsing output json data: ', e)
    return [[], []]
  }
}
