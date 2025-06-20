import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data')
const MEDIA_DIR = path.join(DATA_DIR, 'media')

// Ensure media directory exists
async function ensureMediaDir() {
  await fs.mkdir(MEDIA_DIR, { recursive: true })
}

export async function POST(request: Request) {
  await ensureMediaDir()
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    const buffer = Buffer.from(await file.arrayBuffer())
    const fileHash = crypto.createHash('md5').update(buffer).digest('hex')
    const ext = path.extname(file.name)
    const fileName = `${fileHash}${ext}`
    const filePath = path.join(MEDIA_DIR, fileName)
    await fs.writeFile(filePath, buffer)
    return NextResponse.json({
      id: fileHash,
      name: file.name,
      url: `/api/media/${fileName}`
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
  }
} 