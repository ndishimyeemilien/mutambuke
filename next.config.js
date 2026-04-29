/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https', 
                hostname: 'z-cdn-media.chatglm.cn',
                port: '',
                pathname: '/**', 
            },
            {
                protocol: 'https',
                hostname: 'picsum.photos',
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'cdn-icons-png.flaticon.com',
                port: '',
                pathname: '/**',
            }
        ],
    },
};

module.exports = nextConfig;
