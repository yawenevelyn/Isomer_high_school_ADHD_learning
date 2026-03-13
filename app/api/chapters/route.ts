import { NextResponse } from 'next/server';

const RAG_API_URL = process.env.RAG_API_URL || 'http://localhost:8000';

export async function GET() {
  try {
    const res = await fetch(`${RAG_API_URL}/chapters`, { cache: 'no-store' });
    if (!res.ok) throw new Error('RAG backend not available');
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ chapters: [] });
  }
}
