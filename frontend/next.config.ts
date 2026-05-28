import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow cross-origin requests from the FastAPI backend during development
  allowedDevOrigins: ["http://127.0.0.1:8000", "http://localhost:8000"],
};

export default nextConfig;
