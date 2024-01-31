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

export interface EnumType {
  name: 'enum'
  value: Array<{ value: string }>
}

export interface UnionType {
  name: 'union'
  value: Array<PropData['type']>
}

export interface PropData {
  type: EnumType | UnionType
}

export interface CompData {
  displayName: keyof CompPropTypes
  props?: Record<string, PropData>
}

export type CompPropTypes = Record<string, Record<string, string[]>>
