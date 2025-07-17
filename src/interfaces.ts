/*
 * Copyright IBM Corp. 2024, 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */
export interface CommandLineOptions {
  id: string
  endpoint: string
  filePath: string
  scopes: string[]
  files?: string[]
  ignore?: string[]
}

export type TelemetryScope = 'jsx' | 'js' | 'npm' | 'wc'

// JSX Scope

export interface EnumValue {
  value: string
  computed: boolean
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

// Web Component Scope

export interface AttributeValue {
  name: string
}

export interface AttributeData {
  name: string
  valueSet?: string
  values?: AttributeValue[]
}

export interface WebCompData {
  name: string
  attributes?: AttributeData[]
}

export interface WcaOutput {
  tags: WebCompData[]
}

export type WebCompAttributes = Record<string, Record<string, string[]>>
