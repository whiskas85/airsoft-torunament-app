/** @type {import('next').NextConfig} */
const nextConfig = {
  // immagine Docker piccola: solo il server e i file che servono davvero
  output: 'standalone',
  poweredByHeader: false,
};
export default nextConfig;
