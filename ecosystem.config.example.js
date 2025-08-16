module.exports = {
    "apps": [
      {
        "name": "rostechnopolsk-backend",
        "script": "./backend/server.js",
        "cwd": "/root/rostechnopoisk",
        "env": {
          "NODE_ENV": "production",
          "PORT": 3001
        },
        "instances": 1,
        "exec_mode": "fork",
        "watch": false,
        "max_memory_restart": "500M",
        "error_file": "./logs/backend-error.log",
        "out_file": "./logs/backend-out.log",
        "log_file": "./logs/backend-combined.log",
        "time": true
      },
      {
        "name": "rostechnopolsk-frontend",
        "script": "./frontend-server.js",
        "cwd": "/root/rostechnopoisk",
        "env": {
          "NODE_ENV": "production",
          "PORT": 3000
        },
        "instances": 1,
        "exec_mode": "fork",
        "watch": false,
        "max_memory_restart": "200M",
        "error_file": "./logs/frontend-error.log",
        "out_file": "./logs/frontend-out.log",
        "log_file": "./logs/frontend-combined.log",
        "time": true
      }
    ]
  };
  