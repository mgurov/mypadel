export function dateKey(dateString: string): string {
  return dateString.slice(0, 10)
}

export function dateHeader(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-UK', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export interface DateGroup<T> {
  key: string
  header: string
  items: T[]
}

export function groupByDate<T>(items: T[], getDate: (item: T) => string): DateGroup<T>[] {
  const groups = new Map<string, DateGroup<T>>()
  for (const item of items) {
    const key = dateKey(getDate(item))
    let group = groups.get(key)
    if (!group) {
      group = { key, header: dateHeader(getDate(item)), items: [] }
      groups.set(key, group)
    }
    group.items.push(item)
  }
  return [...groups.values()]
}
