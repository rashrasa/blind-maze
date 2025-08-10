import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true
    }
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      crypto: require.resolve('crypto-browserify'),
    };
    return config
  },
  eslint: {
    ignoreDuringBuilds: true
  }
};

export default nextConfig;
