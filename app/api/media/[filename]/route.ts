import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data')
const MEDIA_DIR = path.join(DATA_DIR, 'media')

export async function GET(request: Request, { params }: { params: { filename: string } }) {
  const { filename } = params
  const filePath = path.join(MEDIA_DIR, filename)
  try {
    const file = await fs.readFile(filePath)
    // Set content type based on file extension
    const ext = path.extname(filename).toLowerCase()
    const contentType = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.mp4': 'video/mp4',
      '.mp3': 'audio/mpeg',
      '.webm': 'video/webm',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg',
      '.svg': 'image/svg+xml',
    }[ext] || 'application/octet-stream'
    return new NextResponse(file, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${filename}"`
      }
    })
  } catch (error) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }
} 