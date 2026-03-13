import { NextResponse } from 'next/server';

const RAG_API_URL = process.env.RAG_API_URL || 'http://localhost:8000';

export async function POST(req: Request) {
  if (!RAG_API_URL) {
    return NextResponse.json({ error: 'RAG backend not available' }, { status: 503 });
  }
  try {
    const { raw_paragraph } = (await req.json()) as { raw_paragraph?: string };
    const res = await fetch(`${RAG_API_URL}/transform`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw_paragraph: raw_paragraph || '' }),
    });
    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: err }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
