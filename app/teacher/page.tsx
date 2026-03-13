'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

type Chunk = { text?: string; chapter_title?: string; page_number?: number | null };

export default function TeacherDashboard() {
  const [chapters, setChapters] = useState<string[]>([]);
  const [selectedChapter, setSelectedChapter] = useState('');
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [loading, setLoading] = useState(false);
  const [adapted, setAdapted] = useState<Record<number, { bulleted_summary?: string; key_terms?: string; check_question?: string } | null>>({});

  useEffect(() => {
    fetch('/api/chapters')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.chapters)) setChapters(d.chapters);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedChapter) {
      setChunks([]);
      return;
    }
    setLoading(true);
    fetch(`/api/teacher/chunks?chapter_title=${encodeURIComponent(selectedChapter)}`)
      .then((r) => r.json())
      .then((d) => {
        setChunks(d.chunks || []);
        setAdapted({});
      })
      .finally(() => setLoading(false));
  }, [selectedChapter]);

  const generateAdapted = async (index: number) => {
    const c = chunks[index];
    if (!c?.text) return;
    setAdapted((prev) => ({ ...prev, [index]: undefined }));
    try {
      const res = await fetch('/api/flowchart/transform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_paragraph: c.text.slice(0, 4000) }),
      });
      const data = await res.json();
      setAdapted((prev) => ({ ...prev, [index]: data }));
    } catch {
      setAdapted((prev) => ({ ...prev, [index]: null }));
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Teacher Dashboard — Scientific Truth Review</h1>
          <Link
            href="/"
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 text-gray-800 font-medium"
          >
            ← Back to Mind Map
          </Link>
        </div>
        <p className="text-gray-600 mb-4">
          Review the original textbook chunks against the Isomer (ADHD-adapted) version before students access them.
        </p>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Chapter / Topic</label>
          <select
            value={selectedChapter}
            onChange={(e) => setSelectedChapter(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[280px]"
          >
            <option value="">Select a chapter</option>
            {chapters.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {loading && <p className="text-gray-500">Loading chunks…</p>}
        {!loading && selectedChapter && chunks.length === 0 && (
          <p className="text-amber-700">No chunks found. Run the RAG ingest script and select a chapter.</p>
        )}
        {!loading && chunks.length > 0 && (
          <div className="space-y-8">
            {chunks.slice(0, 15).map((chunk, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-x divide-gray-200">
                  <div className="p-4">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Original (textbook)</h3>
                    <div className="text-sm text-gray-800 whitespace-pre-wrap max-h-48 overflow-y-auto">
                      {(chunk.text || '').slice(0, 1500)}
                      {(chunk.text?.length || 0) > 1500 ? '…' : ''}
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Isomer (adapted)</h3>
                    {adapted[i] === undefined && (
                      <button
                        onClick={() => generateAdapted(i)}
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                      >
                        Generate adapted version
                      </button>
                    )}
                    {adapted[i] === null && (
                      <p className="text-red-600 text-sm">Failed to generate.</p>
                    )}
                    {adapted[i] && (
                      <div className="text-sm text-gray-800 space-y-2 max-h-48 overflow-y-auto">
                        {adapted[i].bulleted_summary && (
                          <div>
                            <span className="font-medium text-gray-600">Summary: </span>
                            <span className="whitespace-pre-wrap">{adapted[i].bulleted_summary}</span>
                          </div>
                        )}
                        {adapted[i].key_terms && (
                          <div>
                            <span className="font-medium text-gray-600">Key terms: </span>
                            <span>{adapted[i].key_terms}</span>
                          </div>
                        )}
                        {adapted[i].check_question && (
                          <div>
                            <span className="font-medium text-gray-600">Check: </span>
                            <span className="whitespace-pre-wrap">{adapted[i].check_question}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
