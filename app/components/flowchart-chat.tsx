'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { TextStreamChatTransport, type UIMessage, type TextUIPart } from 'ai';
import { Send, MessageCircle, Bot, User, Volume2, VolumeX, StopCircle } from 'lucide-react';
import { MemoizedMarkdown } from './memoized-markdown';

interface FlowchartChatProps {
  nodeName?: string;
  nodeDetails?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function FlowchartChat({ nodeName, nodeDetails, isOpen }: FlowchartChatProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const lastSpokenRef = useRef<string>('');
	const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
	const [isSpeaking, setIsSpeaking] = useState(false);
	const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);

  const { messages, sendMessage, status } = useChat({
    transport: new TextStreamChatTransport({
      api: '/api/flowchart/chat',
      body: { nodeName, nodeDetails },
    }),
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    sendMessage({ text });
    setInput('');
  };

  const isLoading = status === 'submitted' || status === 'streaming';

  function getMessageText(message: UIMessage): string {
    return (message.parts || [])
      .map(part => (part as TextUIPart).type === 'text' ? (part as TextUIPart).text : '')
      .join('');
  }

	useEffect(() => {
		if (!voiceEnabled) return;
		if (status === 'streaming') return;
		let lastAssistantIndex: number | null = null;
		for (let i = messages.length - 1; i >= 0; i--) {
			if (messages[i].role !== 'user') {
				lastAssistantIndex = i;
				break;
			}
		}
		if (lastAssistantIndex === null) return;
		const lastAssistant = messages[lastAssistantIndex];
		const text = getMessageText(lastAssistant).trim();
		if (!text) return;
		if (text === lastSpokenRef.current) return;
		try {
			if ('speechSynthesis' in window) {
				window.speechSynthesis.cancel();
				const utterance = new SpeechSynthesisUtterance(text);
				utterance.rate = 1.0;
				utterance.pitch = 1.0;
				utterance.volume = 1.0;
				utterance.onend = () => {
					setIsSpeaking(false);
					setSpeakingIndex(current => current === lastAssistantIndex ? null : current);
					utteranceRef.current = null;
				};
				utterance.onerror = () => {
					setIsSpeaking(false);
					setSpeakingIndex(current => current === lastAssistantIndex ? null : current);
					utteranceRef.current = null;
				};
				utteranceRef.current = utterance;
				window.speechSynthesis.speak(utterance);
				lastSpokenRef.current = text;
				setIsSpeaking(true);
				setSpeakingIndex(lastAssistantIndex);
			}
		} catch {}
	}, [messages, status, voiceEnabled]);

	useEffect(() => {
		if (!voiceEnabled) {
			try {
				if ('speechSynthesis' in window) {
					window.speechSynthesis.cancel();
				}
			} catch {}
			setIsSpeaking(false);
			setSpeakingIndex(null);
			utteranceRef.current = null;
		}
	}, [voiceEnabled]);

	function stopSpeaking() {
		try {
			if ('speechSynthesis' in window) {
				window.speechSynthesis.cancel();
			}
		} catch {}
		setIsSpeaking(false);
		setSpeakingIndex(null);
		utteranceRef.current = null;
	}

  if (!isOpen) return null;

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-8 h-8 text-blue-600" />
            </div>
            <h4 className="text-lg font-medium text-gray-800 mb-2">Welcome to the Learning Assistant!</h4>
            <p className="text-gray-600 text-sm">
              I&apos;m here to help you understand the flowchart concepts and answer your questions.
              {nodeName && ` I have context about "${nodeName}" and can help explain it in detail.`}
            </p>
          </div>
        )}

        {messages.map((message: UIMessage, index: number) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`flex items-start space-x-3 max-w-[85%] ${
                message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.role === 'user'
                    ? 'bg-gradient-to-br from-blue-500 to-blue-600'
                    : 'bg-gradient-to-br from-purple-500 to-purple-600'
                }`}
              >
                {message.role === 'user' ? (
                  <User className="w-4 h-4 text-white" />
                ) : (
                  <Bot className="w-4 h-4 text-white" />
                )}
              </div>
              <div
                className={`rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {message.role === 'user' ? (
                  <div className="text-sm whitespace-pre-wrap">{getMessageText(message)}</div>
                ) : (
					<div className="text-sm">
						<div className="flex items-start gap-2">
							<div className="flex-1">
								<MemoizedMarkdown content={getMessageText(message)} id={`chat-message-${index}`} />
							</div>
							{voiceEnabled && isSpeaking && index === speakingIndex && (
								<button
									type="button"
									onClick={stopSpeaking}
									className="p-1 rounded-md hover:bg-gray-200 text-gray-600"
									aria-label="Stop audio"
									title="Stop audio"
								>
									<StopCircle className="w-4 h-4" />
								</button>
							)}
						</div>
					</div>
                )}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-start space-x-3 max-w-[85%]">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-gray-100 rounded-2xl px-4 py-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="p-6 border-t border-gray-200">
        <form onSubmit={onSubmit} className="flex space-x-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Chat about the topic, ask for hints, or explore related ideas..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => setVoiceEnabled(v => !v)}
            className={`px-3 py-3 rounded-xl border ${voiceEnabled ? 'border-blue-500 text-blue-600' : 'border-gray-300 text-gray-500'} bg-white transition-colors`}
            aria-label={voiceEnabled ? 'Mute voice' : 'Unmute voice'}
            title={voiceEnabled ? 'Mute voice' : 'Unmute voice'}
          >
            {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}


