import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function AdminLogin() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/login');
    }, [router]);

    return null; // Render nothing as we redirect immediately
}
