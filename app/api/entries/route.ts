import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data')
const ENTRIES_FILE = path.join(DATA_DIR, 'entries.json')

// Ensure data directory and file exist
async function ensureDataFile() {
  await fs.mkdir(DATA_DIR, { recursive: true })
  try {
    await fs.access(ENTRIES_FILE)
  } catch {
    await fs.writeFile(ENTRIES_FILE, '[]')
  }
}

export async function GET() {
  await ensureDataFile()
  try {
    const data = await fs.readFile(ENTRIES_FILE, 'utf-8')
    return NextResponse.json(JSON.parse(data))
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read entries' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  await ensureDataFile()
  try {
    const entries = await request.json()
    await fs.writeFile(ENTRIES_FILE, JSON.stringify(entries, null, 2))
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save entries' }, { status: 500 })
  }
} 