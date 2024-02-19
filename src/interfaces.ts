/*
 * Copyright IBM Corp. 2024, 2024
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */
export interface CommandLineOptions {
  files?: string[]
  id: string
  endpoint: string
  filePath: string
  npm: boolean
  jsx: boolean
  ignore?: string[]
}

export interface EnumValue {
  value: string
}

export interface EnumType {
  name: 'enum'
  value: EnumValue[]
}

export interface UnionType {
  name: 'union'
  value: Array<EnumType | UnionType>
}

export interface TSElement {
  name: string
  value: string
}

export interface TSUnionType {
  name: string
  elements?: TSElement[]
}

export interface PropType {
  name: string
  value: unknown
}

export interface PropData {
  type?: PropType
  tsType?: TSUnionType
}

export interface CompData {
  displayName: keyof CompPropTypes
  props?: Record<string, PropData>
}

export type CompPropTypes = Record<string, Record<string, string[]>>
