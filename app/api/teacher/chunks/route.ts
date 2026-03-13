import { NextResponse } from 'next/server';

const RAG_API_URL = process.env.RAG_API_URL || 'http://localhost:8000';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const chapter = searchParams.get('chapter_title') || '';
  if (!RAG_API_URL) {
    return NextResponse.json({ chunks: [] });
  }
  try {
    const res = await fetch(`${RAG_API_URL}/retrieve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '', chapter_title: chapter || undefined, n_results: 25 }),
    });
    if (!res.ok) return NextResponse.json({ chunks: [] });
    const data = await res.json();
    return NextResponse.json({ chunks: data.chunks || [] });
  } catch {
    return NextResponse.json({ chunks: [] });
  }
}
