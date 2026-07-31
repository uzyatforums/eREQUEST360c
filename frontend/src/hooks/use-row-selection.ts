import * as React from 'react'

export interface UseRowSelectionOptions<T> {
  items: T[]
  getKey?: (item: T) => string | number
}

export interface UseRowSelectionReturn<T> {
  selectedIds: Set<string | number>
  selectedCount: number
  selectedItems: T[]
  isSelected: (id: string | number) => boolean
  toggleRow: (id: string | number) => void
  selectAll: () => void
  deselectAll: () => void
  clearSelection: () => void
  toggleSelectAll: () => void
  isAllSelected: boolean
  isSomeSelected: boolean
  isNoneSelected: boolean
  handleSelectAllChange: (checked: boolean) => void
}

export function useRowSelection<T>({
  items,
  getKey = (item: any) => item.id,
}: UseRowSelectionOptions<T>): UseRowSelectionReturn<T> {
  const [selectedIds, setSelectedIds] = React.useState<Set<string | number>>(new Set())

  // Reset or filter selections when items change if item no longer exists
  React.useEffect(() => {
    setSelectedIds((prev) => {
      const validKeys = new Set(items.map(getKey))
      const next = new Set<string | number>()
      prev.forEach((key) => {
        if (validKeys.has(key)) {
          next.add(key)
        }
      })
      if (next.size === prev.size) return prev
      return next
    })
  }, [items, getKey])

  const isSelected = React.useCallback(
    (id: string | number) => selectedIds.has(id),
    [selectedIds]
  )

  const toggleRow = React.useCallback((id: string | number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const selectAll = React.useCallback(() => {
    const allKeys = items.map(getKey)
    setSelectedIds(new Set(allKeys))
  }, [items, getKey])

  const deselectAll = React.useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const clearSelection = deselectAll

  const isAllSelected = React.useMemo(() => {
    return items.length > 0 && selectedIds.size === items.length
  }, [items.length, selectedIds.size])

  const isSomeSelected = React.useMemo(() => {
    return selectedIds.size > 0 && selectedIds.size < items.length
  }, [items.length, selectedIds.size])

  const isNoneSelected = React.useMemo(() => {
    return selectedIds.size === 0
  }, [selectedIds.size])

  const toggleSelectAll = React.useCallback(() => {
    if (isAllSelected) {
      deselectAll()
    } else {
      selectAll()
    }
  }, [isAllSelected, deselectAll, selectAll])

  const handleSelectAllChange = React.useCallback(
    (checked: boolean) => {
      if (checked) {
        selectAll()
      } else {
        deselectAll()
      }
    },
    [selectAll, deselectAll]
  )

  const selectedItems = React.useMemo(() => {
    return items.filter((item) => selectedIds.has(getKey(item)))
  }, [items, selectedIds, getKey])

  return {
    selectedIds,
    selectedCount: selectedIds.size,
    selectedItems,
    isSelected,
    toggleRow,
    selectAll,
    deselectAll,
    clearSelection,
    toggleSelectAll,
    isAllSelected,
    isSomeSelected,
    isNoneSelected,
    handleSelectAllChange,
  }
}
