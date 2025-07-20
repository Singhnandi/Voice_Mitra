// pages/index.tsx

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/firebase/config';
import { collection, addDoc, serverTimestamp, query, orderBy, getDocs } from 'firebase/firestore';
import styles from '@/styles/Home.module.css';

// Define the structure of a chat message
interface Message {
  role: 'user' | 'model';
  text: string;
}

export default function Home() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  // Your existing state
  const [isListening, setIsListening] = useState(false);
  const [userTranscript, setUserTranscript] = useState("");

  // New state for chat history
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingResponse, setIsLoadingResponse] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 1. Redirect unauthenticated users
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // 2. Load chat history from Firestore when user logs in
  useEffect(() => {
    if (user) {
      const fetchMessages = async () => {
        // Path: users -> {userId} -> chats
        const chatCollectionRef = collection(db, 'users', user.uid, 'chats');
        const q = query(chatCollectionRef, orderBy('timestamp', 'asc'));
        const querySnapshot = await getDocs(q);
        const history = querySnapshot.docs.map(doc => doc.data() as Message);
        setMessages(history);
      };
      fetchMessages();
    }
  }, [user]);

  // Scroll to bottom of chat window
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);


  // 3. Helper function to save messages to Firestore
  const saveMessageToDb = async (message: Message) => {
    if (!user) return; // Safety check
    try {
      await addDoc(collection(db, 'users', user.uid, 'chats'), {
        ...message,
        timestamp: serverTimestamp(), // For correct ordering
      });
    } catch (error) {
      console.error("Error saving message:", error);
    }
  };

  // 4. Function to send prompt and get Gemini response
  const getBotResponse = async (prompt: string) => {
    if (!prompt.trim()) return;

    // Add user message to UI and DB
    const userMessage: Message = { role: 'user', text: prompt };
    setMessages(prev => [...prev, userMessage]);
    await saveMessageToDb(userMessage);
    
    setIsLoadingResponse(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) throw new Error(`API Error: ${response.statusText}`);

      const data = await response.json();
      const botMessage: Message = { role: 'model', text: data.text };

      // Add bot message to UI and DB
      setMessages(prev => [...prev, botMessage]);
      await saveMessageToDb(botMessage);

    } catch (error) {
      console.error("Failed to get response:", error);
      const errorMessage: Message = { role: 'model', text: "Sorry, I'm having trouble connecting. Please try again." };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoadingResponse(false);
    }
  };

  // Your voice recognition logic would go here.
  // When your voice recognition finishes, it should call `getBotResponse(final_transcript)`.
  // For this example, we'll use a text input for demonstration.
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    getBotResponse(userTranscript);
    setUserTranscript('');
  };

  // Show a loading screen while checking auth status
  if (loading || !user) {
    return <main className={styles.main}><h1>Loading...</h1></main>;
  }

  return (
    <>
      {/* THIS IS THE MISSING HEADER SECTION */}
      <header className={styles.header}>
        <span>{user.email}</span>
        <button onClick={signOut} className={styles.logoutButton}>
          Logout
        </button>
      </header>

      {/* THIS IS YOUR EXISTING MAIN CONTENT */}
      <main className={styles.main}>
        <h1 className={styles.title}>
          Voice Mitra 🎙️
        </h1>

        <div className={styles.chatWindow}>
          {messages.map((msg, index) => (
            <div key={index} className={msg.role === 'user' ? styles.userMessage : styles.modelMessage}>
              <p><strong>{msg.role === 'user' ? 'You' : 'Mitra'}:</strong> {msg.text}</p>
            </div>
          ))}
          {isLoadingResponse && <div className={styles.modelMessage}><p>Mitra is thinking...</p></div>}
          <div ref={chatEndRef} />
        </div>
        
        <form onSubmit={handleFormSubmit} className={styles.form}>
            <input 
                type="text"
                value={userTranscript}
                onChange={(e) => setUserTranscript(e.target.value)}
                placeholder="Type your message or use voice..."
                className={styles.input}
                disabled={isLoadingResponse}
            />
            <button type="submit" className={styles.button} disabled={isLoadingResponse}>
                Send
            </button>
        </form>
      </main>
    </>
  );
}