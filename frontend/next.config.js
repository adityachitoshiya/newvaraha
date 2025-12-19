/** @type {import('next').NextConfig} */
const nextConfig = {
    // Optimize compilation and reduce recompilation
    reactStrictMode: false, // Disable strict mode to prevent double rendering in dev
    swcMinify: true, // Use SWC for faster minification
    
    // Reduce recompilation on file changes
    webpack: (config, { dev }) => {
        if (dev) {
            config.watchOptions = {
                poll: 1000, // Check for changes every second
                aggregateTimeout: 300, // Delay rebuild after first change
                ignored: /node_modules/,
            };
        }
        return config;
    },
    
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
