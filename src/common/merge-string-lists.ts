/*
 * Copyright IBM Corp. 2025, 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { type Node } from 'yaml'

/** An item in a YAML string-list: either a plain string or a yaml scalar Node. */
type StringListItem = string | Node

/**
 * Extracts the string value from a {@link StringListItem}.
 * Plain strings are returned as-is; yaml scalar Nodes expose their content
 * via `.value`.
 *
 * @param item - The string or yaml scalar Node to extract a value from.
 * @returns The string value of the item.
 */
const itemValue = (item: StringListItem): string =>
  typeof item === 'string' ? item : String((item as { value: unknown }).value)

/**
 * Returns a deduplicated union of two string lists. `existingNode` is the raw
 * YAML sequence node read from the config file (containing
 * {@link StringListItem} entries). `newItems` is the freshly-scanned array
 * produced by the config generator. Existing items are kept first;
 * newly-discovered items not already present are appended.
 *
 * @param existingNode - The YAML sequence node from the current config file.
 * @param newItems - The array of new values produced by the scanner.
 * @returns A combined array with duplicates removed.
 */
export function mergeStringLists(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- yaml sequence node
  existingNode: any,
  newItems: StringListItem[]
): StringListItem[] {
  const existingItems: StringListItem[] = existingNode?.items ?? []
  const existingValues = new Set(existingItems.map(itemValue))
  const addedItems = newItems.filter((item) => !existingValues.has(itemValue(item)))
  return [...existingItems, ...addedItems]
}
