// How many cards go in each row, given the total number of cards.
// Up to `singleRowMax` cards fit in one row. Beyond that, use as few rows as possible
// (max `maxPerRow` per row), spread cards evenly, and put any extra cards in the bottom
// rows so each row is centered like a pyramid.
//
//   1-5 -> one row   6 -> [3, 3]   7 -> [3, 4]   8 -> [4, 4]   9 -> [3, 3, 3]
export function rowSizes(count: number, maxPerRow = 4, singleRowMax = 5): number[] {
  if (count <= 0) return []
  if (count <= singleRowMax) return [count]
  const rows = Math.ceil(count / maxPerRow)
  const base = Math.floor(count / rows) // cards every row gets
  const extra = count % rows // leftover cards, one each for the last `extra` rows
  return Array.from({ length: rows }, (_, i) => base + (i >= rows - extra ? 1 : 0))
}

// Index of the "center" slot: middle card of the middle row.
//   5 in a row -> 2   9 (3/3/3) -> 4   7 (3/4) -> 5   8 (4/4) -> 6
export function centerIndex(count: number): number {
  const sizes = rowSizes(count)
  const middleRow = Math.floor(sizes.length / 2)
  const before = sizes.slice(0, middleRow).reduce((sum, n) => sum + n, 0)
  return before + Math.floor((sizes[middleRow] ?? 0) / 2)
}

// Splits `items` into rows using rowSizes(): [a,b,c,d,e,f,g] -> [[a,b,c],[d,e,f,g]]
export function toRows<T>(items: T[]): T[][] {
  const rows: T[][] = []
  let start = 0
  for (const size of rowSizes(items.length)) {
    rows.push(items.slice(start, start + size))
    start += size
  }
  return rows
}
