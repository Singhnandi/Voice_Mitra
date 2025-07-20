// pages/login.tsx

import { useState } from 'react';
import { useRouter } from 'next/router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/firebase/config';
import Link from 'next/link';
import styles from '@/styles/Home.module.css'; // Reuse some styles

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/'); // Redirect to home page on success
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>Login to Voice Mitra</h1>
      <form onSubmit={handleLogin} className={styles.form}>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email Address" required className={styles.input} />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required className={styles.input} />
        <button type="submit" className={styles.button}>Login</button>
        {error && <p className={styles.error}>{error}</p>}
      </form>
      <p>Don't have an account? <Link href="/signup">Sign Up</Link></p>
    </main>
  );
}