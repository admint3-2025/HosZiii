export type CategoryNode = {
  id: string
  name: string
  parent_id: string | null
}

export function getCategoryPathNames(
  categories: CategoryNode[],
  categoryId: string | null | undefined
): string[] {
  if (!categoryId) return []

  const byId = new Map(categories.map((c) => [c.id, c]))
  const names: string[] = []

  let currentId: string | null = categoryId
  const seen = new Set<string>()

  while (currentId) {
    if (seen.has(currentId)) break
    seen.add(currentId)

    const node = byId.get(currentId)
    if (!node) break
    names.push(node.name)
    currentId = node.parent_id
  }

  return names.reverse()
}

export function getCategoryPathLabel(
  categories: CategoryNode[],
  categoryId: string | null | undefined,
  separator = ' > '
): string {
  return getCategoryPathNames(categories, categoryId).join(separator)
}
