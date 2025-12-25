import dotenv from "dotenv";
import { connectDB } from "./db/index.js"; // Assuming connectDB is in a separate file
import cluster from "cluster";
import os from "os";
import { app } from "./app.js";
import { startCronJobs } from "./cronJobs/CreateGameCronJob.js";
import mongoose from "mongoose";

// Load environment variables
dotenv.config();
let cronStarted = false;
// const numCPUs = os.cpus().length;
const numCPUs = 5;

// Establish database connection
const connectDBPromise = connectDB(); // Connect to MongoDB and store the promise

// Function to close MongoDB connection
const closeDBConnection = async () => {
  try {
    await connectDBPromise; // Wait for the connection to be established before closing
    console.log("Closing MongoDB connection...");
    await mongoose.connection.close();
    console.log("MongoDB connection closed.");
  } catch (error) {
    console.error("Error closing MongoDB connection:", error.message);
  }
};

// Handle clusters
const handleClusters = () => {
  if (cluster.isPrimary) {
    for (let i = 0; i < numCPUs - 2; i++) {
      cluster.fork();
    }

    // Listen for dying workers and fork a new one
    cluster.on("exit", (worker, code, signal) => {
      console.log(`Worker ${worker.process.pid} died. Forking new worker...`);
      cluster.fork();
    });
  } else {
    // Wait for the database connection to be established before proceeding
    connectDBPromise
      .then(async () => {
        // Start cron job if not already started (within worker process 1)
        if (!cronStarted && cluster.worker.id === 1) {
          startCronJobs();
          cronStarted = true;
        }

        // Start Express server
        app.listen(process.env.PORT || 8000, () => {
          console.log(
            `Server is running on port ${process.env.PORT || 8000} and worker process ${process.pid}`
          );
        });
      })
      .catch((error) => {
        console.error("⚠️ MongoDB Connection Failed :- ", error);
        process.exit(1);
      });
  }
};

// Close MongoDB connection before server shutdown
const closeDBOnExit = async () => {
  await closeDBConnection();
  process.exit(0);
};

// Listen for SIGINT signal (Ctrl+C) and close MongoDB connection
process.on("SIGINT", closeDBOnExit);

// Listen for nodemon restart event (SIGUSR2) and close MongoDB connection
process.once("SIGUSR2", () => {
  closeDBOnExit();
  process.kill(process.pid, "SIGUSR2");
});

handleClusters();
