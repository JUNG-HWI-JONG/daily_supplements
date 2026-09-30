import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 개발 서버에 같은 와이파이의 휴대폰(192.168.x.x)으로 접속해 테스트할 수 있게 허용 (개발 모드에만 적용)
  allowedDevOrigins: ["192.168.*.*"],
};

export default nextConfig;
