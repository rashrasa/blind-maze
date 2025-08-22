import type { NextConfig } from "next";
import HtmlWebpackPlugin from "html-webpack-plugin";

const nextConfig: NextConfig = {
  webpack: (config, { buildId, dev, isServer, defaultLoaders, nextRuntime, webpack }) => {
    config.plugins = [
      ...config.plugins,
      new HtmlWebpackPlugin(),
    ]
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true
    };
    return config
  },
  eslint: {
    ignoreDuringBuilds: true
  }
};

export default nextConfig;
