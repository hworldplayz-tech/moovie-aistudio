import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'src', 'lib', 'added-content.json');
    const fileData = await fs.readFile(filePath, 'utf-8');
    const content = JSON.parse(fileData);
    return NextResponse.json(content);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      // If file doesn't exist, return empty array
      return NextResponse.json([]);
    }
    console.error('Failed to read added-content.json', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
