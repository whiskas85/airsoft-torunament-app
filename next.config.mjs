/** @type {import('next').NextConfig} */
const nextConfig = {
  // immagine Docker piccola: solo il server e i file che servono davvero
  output: 'standalone',
  poweredByHeader: false,
  // regolamenti e book in PDF possono superare i 10 MB
  experimental: { serverActions: { bodySizeLimit: '60mb' } },
};
export default nextConfig;
