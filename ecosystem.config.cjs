module.exports = {
  apps: [
    {
      name: "fishtokri-api",
      script: "./artifacts/api-server/dist/index.mjs",
      cwd: "/var/www/fishtokri",
      instances: 1,
      autorestart: true,
      watch: false,
      // Routine stdout must not be retained by PM2. Error output remains
      // available through PM2's error log for genuine failures.
      out_file: "/dev/null",
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        PORT: 3015,
        BASE_URL: "https://admin.fishtokri.in",
        // Credentials are provided through the process environment.
      },
    },
  ],
};