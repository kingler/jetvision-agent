'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
    const router = useRouter();
    
    useEffect(() => {
        // Redirect to JetVision chat as the default interface
        router.push('/chat');
    }, [router]);
    
    return <></>;
}