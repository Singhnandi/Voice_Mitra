// File: pages/index.tsx

import { useState, useEffect, useRef } from 'react';
import styles from '../styles/Home.module.css'; // We'll create this file next
import Head from 'next/head';

// Define the interface for the SpeechRecognition object
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function VoiceMitraPage() {
  // State variables to manage the component's data and UI
  const [isListening, setIsListening] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A ref to hold the SpeechRecognition instance
  const recognitionRef = useRef<any>(null);

  // This effect runs once when the component mounts to set up speech recognition
  useEffect(() => {
    // Check if the browser supports the Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Your browser doesn't support the Web Speech API. Try Chrome or Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false; // Stop listening after a single utterance
    recognition.interimResults = false; // We only want the final result
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setUserInput(transcript);
      sendToGemini(transcript);
    };
    recognition.onerror = (event: any) => {
      setError(`Speech recognition error: ${event.error}`);
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);
    
    recognitionRef.current = recognition;
  }, []);

  const handleListen = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setUserInput('');
      setAiResponse('');
      setError(null);
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const sendToGemini = async (text: string) => {
    if (!text) return;

    setIsLoading(true);
    setAiResponse('');
    setError(null);

    try {
      // The API endpoint path is '/api/chat'
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text }),
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      const data = await response.json();
      setAiResponse(data.text);
    } catch (err: any) {
      setError(`Failed to get response from AI. ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Voice Mitra</title>
        <meta name="description" content="AI Chatbot powered by voice and Gemini" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>
          Voice Mitra 🎙️
        </h1>
        <p className={styles.description}>
          Click the button and start speaking.
        </p>

        <div className={styles.buttonContainer}>
          <button onClick={handleListen} className={styles.micButton} disabled={!!error}>
            {isListening ? '🛑 Stop Listening' : '🎤 Start Listening'}
          </button>
        </div>

        <div className={styles.chatArea}>
          {userInput && (
            <div className={styles.chatBubbleUser}>
              <p><strong>You said:</strong></p>
              <p>{userInput}</p>
            </div>
          )}
          {isLoading && (
             <div className={styles.chatBubbleAi}>
              <p>Mitra is thinking...</p>
             </div>
          )}
          {aiResponse && (
            <div className={styles.chatBubbleAi}>
              <p><strong>Mitra says:</strong></p>
              <p>{aiResponse}</p>
            </div>
          )}
          {error && <p className={styles.error}>{error}</p>}
        </div>
      </main>
    </div>
  );
}