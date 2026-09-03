module.exports = {
  apps: [
    {
      name: "ferreteria-ap",
      script: ".next/standalone/server.js",
      cwd: "C:\\Users\\Administrator\\ferreteria-ap",
      interpreter: "node",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        HOSTNAME: "0.0.0.0",
      },
    },
  ],
};
