module.exports = {
  apps: [
    {
      name: "ferreteria",
      script: "node_modules\\.bin\\next",
      args: "start",
      cwd: "C:\\Users\\Administrator\\ferreteria-ap",
      interpreter: "node",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};
