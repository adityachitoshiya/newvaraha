/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'images.unsplash.com',
            },
            {
                protocol: 'https',
                hostname: 'ui-avatars.com',
            },
            {
                protocol: 'https',
                hostname: 'plus.unsplash.com',
            },
            {
                protocol: 'https',
                hostname: 'pin.it',
            },
            {
                protocol: 'https',
                hostname: 'i.pinimg.com',
            },
            {
                protocol: 'https',
                hostname: 'fqnzerfbrwwranmiznkw.supabase.co',
            },
        ],
    },
};

export default nextConfig;
