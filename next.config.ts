/**
  * @fileoverview Next.js Configuration
  *
  * Central Next.js configuration for the Raw System application.
  * Currently enables the React Compiler for build-time optimizations.
  */
 
import type { NextConfig } from "next";
 
const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
};

export default nextConfig;
