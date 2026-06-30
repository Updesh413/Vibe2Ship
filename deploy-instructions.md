# Secure Deploy of Vibe2Ship to Google Cloud Run 🚀

This guide provides instructions for deploying the containerized Vibe2Ship application to **Google Cloud Run** using a local build strategy. This ensures that **no API keys or private credentials** are hardcoded in your `Dockerfile` or source code repository.

---

## Deployment Strategy: Local Build (Secure & Fast)

Instead of compiling your React frontend inside the Google Cloud container (which requires exposing public Firebase keys during container builds), we compile the frontend locally where it automatically reads your private `.env` file. 

Then, the Docker container simply packages the compiled `dist/` directory and your `server.js` file, ensuring complete secrecy of all API keys.

---

## Prerequisites & Setup

### Step 1: Login & Configure GCP Project
Open your terminal (e.g. Command Prompt or PowerShell) and run:
1. Log in to your Google Cloud account:
   ```cmd
   gcloud auth login
   ```
2. Set your active Google Cloud project:
   ```cmd
   gcloud config set project vibe2ship-8914a
   ```

---

## Step 2: Compile & Deploy

Run the following commands from the root directory of your project:

### 1. Build the frontend locally
This reads your local `.env` and compiles the production assets into `dist/`:
```cmd
npm run build
```

### 2. Deploy to Cloud Run
Deploy the application, passing only your private `GEMINI_API_KEY` as a runtime environment variable. 

*Replace `[YOUR_GEMINI_API_KEY]` with your actual Gemini API key:*

```cmd
gcloud run deploy vibe2ship --source . --region us-central1 --allow-unauthenticated --set-env-vars="GEMINI_API_KEY=[YOUR_GEMINI_API_KEY]"
```

*Note: Since the frontend was compiled locally, all Firebase configuration keys are already securely baked into the compiled `dist/` assets, so you don't need to specify any build environment variables!*

---

## Troubleshooting & Verification

### Local Docker Testing
If you want to verify the Docker image locally before deploying:
1. Compile your frontend:
   ```cmd
   npm run build
   ```
2. Build the Docker container:
   ```cmd
   docker build -t vibe2ship .
   ```
3. Run the container locally (replace `[YOUR_GEMINI_API_KEY]` with your key):
   ```cmd
   docker run -p 8080:8080 -e GEMINI_API_KEY="[YOUR_GEMINI_API_KEY]" vibe2ship
   ```
   Open `http://localhost:8080` in your web browser to test.
