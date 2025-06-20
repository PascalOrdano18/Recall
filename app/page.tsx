"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { useTheme } from "next-themes"
import {
  CalendarDays,
  Plus,
  Save,
  Upload,
  ImageIcon,
  Video,
  Music,
  FileText,
  Edit,
  FileEdit,
  Moon,
  Sun,
  Search,
  X,
  GripVertical,
} from "lucide-react"
import { format } from "date-fns"

interface MediaItem {
  id: string
  type: "image" | "video" | "audio"
  url: string
  name: string
}

interface TextBlock {
  id: string
  text: string
  timestamp: string
}

interface DisplayItem {
  id: string
  type: "text" | "media"
  itemId: string // References either textBlock.id or media.id
}

interface Entry {
  id: string
  date: string
  title: string
  textBlocks: TextBlock[]
  media: MediaItem[]
  displayOrder: DisplayItem[]
  createdAt: string
  updatedAt: string
}

export default function PersonalLog() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [entries, setEntries] = useState<Entry[]>([])
  const [currentEntry, setCurrentEntry] = useState<Entry | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState("")
  const [editBlocks, setEditBlocks] = useState<TextBlock[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Entry[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [draggedItem, setDraggedItem] = useState<string | null>(null)
  const [dragOverItem, setDragOverItem] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { theme, setTheme } = useTheme()

  // Load entries from backend API on mount
  useEffect(() => {
    const loadEntries = async () => {
      try {
        const res = await fetch('/api/entries')
        if (res.ok) {
          setEntries(await res.json())
        }
      } catch (error) {
        console.error('Error loading entries:', error)
      }
    }
    loadEntries()
  }, [])

  // Save entries to backend API whenever entries change
  useEffect(() => {
    const saveEntries = async () => {
      try {
        await fetch('/api/entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entries)
        })
      } catch (error) {
        console.error('Error saving entries:', error)
      }
    }
    if (entries.length > 0) saveEntries()
  }, [entries])

  // Check if the selected date allows editing (today or past)
  const canEdit = selectedDate <= new Date()

  // Load entry for selected date
  useEffect(() => {
    const dateStr = format(selectedDate, "yyyy-MM-dd")
    const entry = entries.find((e) => e.date === dateStr)
    setCurrentEntry(entry || null)
    setTitle(entry?.title || "")
    setEditBlocks(entry?.textBlocks ? entry.textBlocks : [])
    setIsEditing(false)
  }, [selectedDate, entries])

  // Search functionality
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setSearchResults([])
      setShowSearchResults(false)
      return
    }

    const filtered = entries.filter((entry) => entry.title.toLowerCase().includes(searchQuery.toLowerCase()))
    setSearchResults(filtered)
    setShowSearchResults(true)
  }, [searchQuery, entries])

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    const newMediaItems: MediaItem[] = []
    const newDisplayItems: DisplayItem[] = []

    for (const file of Array.from(files)) {
      const formData = new FormData()
      formData.append('file', file)
      try {
        const res = await fetch('/api/media', {
          method: 'POST',
          body: formData
        })
        if (!res.ok) throw new Error('Failed to upload file')
        const data = await res.json()
        const mediaId = data.id
        const type = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'audio'
        newMediaItems.push({
          id: mediaId,
          type,
          url: data.url,
          name: file.name
        })
        newDisplayItems.push({
          id: `display-${mediaId}`,
          type: 'media',
          itemId: mediaId
        })
      } catch (error) {
        console.error('Error uploading file:', error)
      }
    }

    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    const now = new Date().toISOString()

    if (currentEntry) {
      const updatedEntry = {
        ...currentEntry,
        title: title,
        media: [...currentEntry.media, ...newMediaItems],
        displayOrder: [...currentEntry.displayOrder, ...newDisplayItems],
        updatedAt: now
      }
      setCurrentEntry(updatedEntry)
      setEntries(prev => prev.map(e => e.id === currentEntry.id ? updatedEntry : e))
    } else {
      const newEntry: Entry = {
        id: Date.now().toString(),
        date: dateStr,
        title: title || '',
        textBlocks: [],
        media: newMediaItems,
        displayOrder: [...newDisplayItems],
        createdAt: now,
        updatedAt: now
      }
      setCurrentEntry(newEntry)
      setEntries(prev => [...prev, newEntry])
    }
    event.target.value = ''
    setIsEditing(true)
  }

  const addTextBlock = () => {
    setEditBlocks((prev) => [
      ...prev,
      {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        text: "",
        timestamp: new Date().toISOString(),
      },
    ])
  }

  const removeTextBlock = (id: string) => {
    setEditBlocks((prev) => prev.filter((b) => b.id !== id))
  }

  const updateTextBlock = (id: string, text: string) => {
    setEditBlocks((prev) => prev.map((b) => b.id === id ? { ...b, text } : b))
  }

  const saveEntry = () => {
    const dateStr = format(selectedDate, "yyyy-MM-dd")
    const now = new Date().toISOString()
    const nonEmptyBlocks = editBlocks.filter((b) => b.text.trim() !== "")
    const textDisplayItems: DisplayItem[] = nonEmptyBlocks.map((block) => ({
      id: `display-${block.id}`,
      type: "text",
      itemId: block.id,
    }))
    if (currentEntry) {
      const existingMediaDisplayItems = currentEntry.displayOrder.filter((item) => item.type === "media")
      const updatedEntry = {
        ...currentEntry,
        title,
        textBlocks: nonEmptyBlocks,
        displayOrder: [...textDisplayItems, ...existingMediaDisplayItems],
        updatedAt: now,
      }
      setCurrentEntry(updatedEntry)
      setEntries((prev) => prev.map((e) => (e.id === currentEntry.id ? updatedEntry : e)))
    } else {
      const newEntry: Entry = {
        id: Date.now().toString(),
        date: dateStr,
        title,
        textBlocks: nonEmptyBlocks,
        media: [],
        displayOrder: textDisplayItems,
        createdAt: now,
        updatedAt: now,
      }
      setCurrentEntry(newEntry)
      setEntries((prev) => [...prev, newEntry])
    }
    setIsEditing(false)
  }

  const deleteMediaItem = (mediaId: string) => {
    if (currentEntry) {
      const updatedEntry = {
        ...currentEntry,
        media: currentEntry.media.filter((m) => m.id !== mediaId),
        displayOrder: currentEntry.displayOrder.filter((item) => item.itemId !== mediaId),
        updatedAt: new Date().toISOString(),
      }
      setCurrentEntry(updatedEntry)
      setEntries((prev) => prev.map((e) => (e.id === currentEntry.id ? updatedEntry : e)))
    }
  }

  const moveDisplayItem = (fromIndex: number, toIndex: number) => {
    if (!currentEntry) return

    const updatedDisplayOrder = [...currentEntry.displayOrder]
    const [movedItem] = updatedDisplayOrder.splice(fromIndex, 1)
    updatedDisplayOrder.splice(toIndex, 0, movedItem)

    const updatedEntry = {
      ...currentEntry,
      displayOrder: updatedDisplayOrder,
      updatedAt: new Date().toISOString(),
    }
    setCurrentEntry(updatedEntry)
    setEntries((prev) => prev.map((e) => (e.id === currentEntry.id ? updatedEntry : e)))
  }

  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    setDraggedItem(itemId)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent, itemId: string) => {
    e.preventDefault()
    setDragOverItem(itemId)
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
    setDragOverItem(null)
  }

  const handleDrop = (e: React.DragEvent, targetItemId: string) => {
    e.preventDefault()
    if (!draggedItem || !currentEntry) return

    const fromIndex = currentEntry.displayOrder.findIndex((item) => item.id === draggedItem)
    const toIndex = currentEntry.displayOrder.findIndex((item) => item.id === targetItemId)

    if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
      moveDisplayItem(fromIndex, toIndex)
    }

    setDraggedItem(null)
    setDragOverItem(null)
  }

  const getMediaIcon = (type: string) => {
    switch (type) {
      case "image":
        return <ImageIcon className="w-4 h-4" />
      case "video":
        return <Video className="w-4 h-4" />
      case "audio":
        return <Music className="w-4 h-4" />
      default:
        return <FileText className="w-4 h-4" />
    }
  }

  const hasEntryForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd")
    return entries.some((e) => e.date === dateStr)
  }

  const clearSearch = () => {
    setSearchQuery("")
    setShowSearchResults(false)
  }

  const selectSearchResult = (entry: Entry) => {
    const [year, month, day] = entry.date.split("-").map(Number)
    setSelectedDate(new Date(year, month - 1, day))
    clearSearch()
  }

  const renderDisplayItem = (displayItem: DisplayItem) => {
    if (!currentEntry) return null
    const isBeingDragged = draggedItem === displayItem.id
    const isDraggedOver = dragOverItem === displayItem.id

    if (displayItem.type === "text") {
      const block = (currentEntry.textBlocks || []).find((b) => b.id === displayItem.itemId)
      if (!block) return null
      return (
        <div
          key={displayItem.id}
          className={`group flex gap-4 items-start p-2 rounded-lg transition-all duration-200 ${
            isBeingDragged ? "opacity-50" : ""
          } ${
            isDraggedOver ? "border-2 border-blue-300 bg-blue-50 dark:bg-blue-950/20" : "border-2 border-transparent"
          } ${!isEditing ? "" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"}`}
          draggable={!isEditing}
          onDragStart={(e) => handleDragStart(e, displayItem.id)}
          onDragOver={(e) => handleDragOver(e, displayItem.id)}
          onDragEnd={handleDragEnd}
          onDrop={(e) => handleDrop(e, displayItem.id)}
        >
          {!isEditing && (
            <div className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity">
              <GripVertical className="w-4 h-4 text-slate-400 mt-1" />
            </div>
          )}
          <div className="text-xs text-slate-500 dark:text-slate-400 font-mono w-12 flex-shrink-0 pt-1">
            {block.timestamp.slice(11, 16)}
          </div>
          <div className="text-slate-700 dark:text-slate-300 text-base leading-relaxed flex-1 font-mono whitespace-pre-wrap break-words">
            {block.text}
          </div>
        </div>
      )
    } else {
      const media = currentEntry.media.find((m) => m.id === displayItem.itemId)
      if (!media) return null

      return (
        <div
          key={displayItem.id}
          className={`group relative transition-all duration-200 ${
            isBeingDragged ? "opacity-50" : ""
          } ${isDraggedOver ? "border-2 border-blue-300 bg-blue-50 dark:bg-blue-950/20" : "border-2 border-transparent"}`}
          draggable={!isEditing}
          onDragStart={(e) => handleDragStart(e, displayItem.id)}
          onDragOver={(e) => handleDragOver(e, displayItem.id)}
          onDragEnd={handleDragEnd}
          onDrop={(e) => handleDrop(e, displayItem.id)}
        >
          {!isEditing && (
            <div className="absolute -left-6 top-2 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <GripVertical className="w-4 h-4 text-slate-400" />
            </div>
          )}

          {media.type === "image" && (
            <div className="my-8">
              <Dialog>
                <DialogTrigger asChild>
                  <div className="cursor-pointer group/image">
                    <div className="relative overflow-hidden rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]">
                      <img
                        src={media.url || "/placeholder.svg"}
                        alt={media.name}
                        className="w-full max-w-3xl mx-auto object-cover aspect-video bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900"
                        style={{ minHeight: '300px', maxHeight: '500px' }}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover/image:bg-black/10 transition-colors duration-300" />
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4 opacity-0 group-hover/image:opacity-100 transition-opacity duration-300">
                        <p className="text-white text-sm font-medium truncate">{media.name}</p>
                      </div>
                    </div>
                  </div>
                </DialogTrigger>
                <DialogContent className="max-w-[95vw] max-h-[95vh] w-auto h-auto p-2 bg-black/95 border-none">
                  <div className="flex items-center justify-center w-full h-full">
                    <img
                      src={media.url || "/placeholder.svg"}
                      alt={media.name}
                      className="max-w-full max-h-full object-contain"
                      style={{ maxWidth: "90vw", maxHeight: "90vh" }}
                    />
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
          {media.type === "video" && (
            <div className="my-8">
              <div className="relative overflow-hidden rounded-xl shadow-lg">
                <video 
                  src={media.url} 
                  controls 
                  className="w-full max-w-3xl mx-auto object-cover aspect-video bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900"
                  style={{ minHeight: '300px', maxHeight: '500px' }}
                />
                <div className="absolute top-4 left-4 bg-black/70 text-white px-2 py-1 rounded text-xs font-medium">
                  {media.name}
                </div>
              </div>
            </div>
          )}
          {media.type === "audio" && (
            <div className="my-6">
              <Card className="overflow-hidden border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                      <Music className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-1">{media.name}</h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Audio file</p>
                    </div>
                  </div>
                  <audio src={media.url} controls className="w-full" />
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )
    }
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950">
      {/* Sidebar with Calendar */}
      <div className="w-80 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <FileEdit className="w-6 h-6 text-slate-700 dark:text-slate-300" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Personal Log</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">Daily entries</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Search entry titles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSearch}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>

          {/* Search Results */}
          {showSearchResults && (
            <div className="mt-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 max-h-40 overflow-y-auto">
              {searchResults.length > 0 ? (
                <div className="p-2">
                  {searchResults.map((entry) => (
                    <div
                      key={entry.id}
                      className="p-2 rounded cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 text-sm"
                      onClick={() => selectSearchResult(entry)}
                    >
                      <div className="font-medium text-slate-900 dark:text-slate-100 truncate">
                        {entry.title || "Untitled Entry"}
                      </div>
                      <div className="text-slate-600 dark:text-slate-400 text-xs">
                        {format(new Date(entry.date), "MMM dd, yyyy")}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 text-sm text-slate-500 dark:text-slate-400 text-center">No entries found</div>
              )}
            </div>
          )}
        </div>

        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
          <div className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="rounded-md"
              modifiers={{
                hasEntry: (date) => hasEntryForDate(date),
                future: (date) => date > new Date(),
              }}
              modifiersStyles={{
                hasEntry: {
                  fontWeight: "600",
                  border: "2px solid hsl(var(--primary))",
                },
                future: {
                  opacity: 0.4,
                  textDecoration: "line-through",
                },
              }}
              classNames={{
                day_selected: "!bg-blue-600 !text-white !font-semibold hover:!bg-blue-700 focus:!bg-blue-700",
                day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 relative",
              }}
            />
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-medium mb-3 text-slate-900 dark:text-slate-100">Recent Entries</h3>
          <ScrollArea className="h-40">
            <div className="space-y-2">
              {entries
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 5)
                .map((entry) => (
                  <div
                    key={entry.id}
                    className="p-3 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-sm border border-slate-200 dark:border-slate-700 transition-colors"
                    onClick={() => selectSearchResult(entry)}
                  >
                    <div className="font-medium text-slate-900 dark:text-slate-100 truncate">
                      {entry.title || "Untitled Entry"}
                    </div>
                    <div className="text-slate-600 dark:text-slate-400 text-xs mt-1">
                      {format(new Date(entry.date), "MMM dd, yyyy")}
                    </div>
                    {entry.media.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {entry.media.slice(0, 3).map((media) => (
                          <div key={media.id} className="text-slate-500 dark:text-slate-400">
                            {getMediaIcon(media.type)}
                          </div>
                        ))}
                        {entry.media.length > 3 && (
                          <span className="text-xs text-slate-500 dark:text-slate-400">+{entry.media.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-900">
        <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                {format(selectedDate, "EEEE, MMMM dd, yyyy")}
              </h2>
              {selectedDate > new Date() && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Future entries are not allowed</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="text-slate-600 dark:text-slate-400"
              >
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>
              {currentEntry && !isEditing && canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="border-slate-300 dark:border-slate-600"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              )}
              {isEditing && (
                <Button size="sm" onClick={saveEntry}>
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
              )}
              {!currentEntry && !isEditing && canEdit && (
                <Button size="sm" onClick={() => setIsEditing(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Entry
                </Button>
              )}
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 p-6">
          {isEditing ? (
            <div className="space-y-6 max-w-4xl">
              <Input
                placeholder="Entry title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-xl font-medium"
              />
              {editBlocks.map((block, idx) => (
                <div key={block.id} className="relative group">
                  <Textarea
                    value={block.text}
                    onChange={(e) => updateTextBlock(block.id, e.target.value)}
                    placeholder={`Text block #${idx + 1}`}
                    className="min-h-32 text-base leading-relaxed font-mono"
                  />
                  <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="sm" variant="destructive" onClick={() => removeTextBlock(block.id)}>
                      Remove
                    </Button>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">Created at {block.timestamp.slice(11, 16)}</div>
                </div>
              ))}
              <Button onClick={addTextBlock} variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" /> Add Block
              </Button>

              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  multiple
                  accept="image/*,video/*,audio/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="media-upload"
                />
                <Button variant="outline" size="sm" asChild>
                  <label htmlFor="media-upload" className="cursor-pointer">
                    <Upload className="w-4 h-4 mr-2" />
                    Add Media
                  </label>
                </Button>
              </div>
            </div>
          ) : currentEntry ? (
            <div className="space-y-6 max-w-4xl">
              <h3 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">
                {currentEntry.title || "Untitled Entry"}
              </h3>
              {currentEntry.displayOrder.length > 0 ? (
                <div className="space-y-4 pl-6">
                  {currentEntry.displayOrder.map((displayItem) => renderDisplayItem(displayItem))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-slate-500 dark:text-slate-400">This entry is empty</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                  <CalendarDays className="w-8 h-8" />
                </div>
                <p className="text-lg mb-2">No entry for this date</p>
                <p className="text-sm mb-4">
                  {canEdit ? "Create an entry to get started" : "This date is in the future"}
                </p>
                {canEdit && (
                  <Button onClick={() => setIsEditing(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Entry
                  </Button>
                )}
              </div>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  )
}
