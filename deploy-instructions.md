# Deploying Vibe2Ship to Google Cloud Run 🚀

This guide provides instructions for deploying the containerized Vibe2Ship application to **Google Cloud Run** using the **Google Cloud SDK (`gcloud` CLI)** or **Google Cloud Shell** (no local installation required).

---

## Prerequisites & Setup

Choose one of the following methods to run the deployment commands:

### Option A: Using Google Cloud Shell (No Setup Required - Recommended)
1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. In the top right corner, click the **Activate Cloud Shell** button `[>_]`.
3. Clone your repository into Cloud Shell, navigate to the project folder, and continue with the deployment commands below.

### Option B: Using Local `gcloud` CLI
1. Install the [Google Cloud SDK](https://cloud.google.com/sdk/docs/install).
2. Open your terminal (e.g. PowerShell) and log in:
   ```bash
   gcloud auth login
   ```
3. Set your active Google Cloud project:
   ```bash
   gcloud config set project vibe2ship-8914a
   ```
   *(Replace `vibe2ship-8914a` with your actual Google Cloud Project ID if different)*

---

## Deployment Step 1: Deploying with Cloud Build & Cloud Run

Google Cloud Run allows you to build your container image directly on Google Cloud using Cloud Build and deploy it in a single command. 

Run the following command from the root of the project. 

### Single-Line Command (Recommended - Works in all terminals):
```bash
gcloud run deploy vibe2ship --source . --region us-central1 --allow-unauthenticated --set-env-vars="GEMINI_API_KEY=AIzaSyDDvtviYSXSGodZDIdTEAvcrXTN2-K_ji0" --set-build-env-vars="VITE_FIREBASE_API_KEY=AIzaSyDQyx2HdTIdJLCZVmYwEL_m5jnS3l2VoyA,VITE_FIREBASE_AUTH_DOMAIN=vibe2ship-8914a.firebaseapp.com,VITE_FIREBASE_PROJECT_ID=vibe2ship-8914a,VITE_FIREBASE_STORAGE_BUCKET=vibe2ship-8914a.firebasestorage.app,VITE_FIREBASE_MESSAGING_SENDER_ID=1038395846432,VITE_FIREBASE_APP_ID=1:1038395846432:web:b41cc891379fd23db33145"
```

### Multi-Line Command formatting (depending on your shell):
* **Windows Command Prompt (CMD)** (uses `^`):
  ```cmd
  gcloud run deploy vibe2ship ^
    --source . ^
    --region us-central1 ^
    --allow-unauthenticated ^
    --set-env-vars="GEMINI_API_KEY=AIzaSyDDvtviYSXSGodZDIdTEAvcrXTN2-K_ji0" ^
    --set-build-env-vars="VITE_FIREBASE_API_KEY=AIzaSyDQyx2HdTIdJLCZVmYwEL_m5jnS3l2VoyA,VITE_FIREBASE_AUTH_DOMAIN=vibe2ship-8914a.firebaseapp.com,VITE_FIREBASE_PROJECT_ID=vibe2ship-8914a,VITE_FIREBASE_STORAGE_BUCKET=vibe2ship-8914a.firebasestorage.app,VITE_FIREBASE_MESSAGING_SENDER_ID=1038395846432,VITE_FIREBASE_APP_ID=1:1038395846432:web:b41cc891379fd23db33145"
  ```
* **PowerShell** (uses backtick `` ` ``):
  ```powershell
  gcloud run deploy vibe2ship `
    --source . `
    --region us-central1 `
    --allow-unauthenticated `
    --set-env-vars="GEMINI_API_KEY=AIzaSyDDvtviYSXSGodZDIdTEAvcrXTN2-K_ji0" `
    --set-build-env-vars="VITE_FIREBASE_API_KEY=AIzaSyDQyx2HdTIdJLCZVmYwEL_m5jnS3l2VoyA,VITE_FIREBASE_AUTH_DOMAIN=vibe2ship-8914a.firebaseapp.com,VITE_FIREBASE_PROJECT_ID=vibe2ship-8914a,VITE_FIREBASE_STORAGE_BUCKET=vibe2ship-8914a.firebasestorage.app,VITE_FIREBASE_MESSAGING_SENDER_ID=1038395846432,VITE_FIREBASE_APP_ID=1:1038395846432:web:b41cc891379fd23db33145"
  ```
* **Bash / macOS / Linux / Cloud Shell** (uses backslash `\`):
  ```bash
  gcloud run deploy vibe2ship \
    --source . \
    --region us-central1 \
    --allow-unauthenticated \
    --set-env-vars="GEMINI_API_KEY=AIzaSyDDvtviYSXSGodZDIdTEAvcrXTN2-K_ji0" \
    --set-build-env-vars="VITE_FIREBASE_API_KEY=AIzaSyDQyx2HdTIdJLCZVmYwEL_m5jnS3l2VoyA,VITE_FIREBASE_AUTH_DOMAIN=vibe2ship-8914a.firebaseapp.com,VITE_FIREBASE_PROJECT_ID=vibe2ship-8914a,VITE_FIREBASE_STORAGE_BUCKET=vibe2ship-8914a.firebasestorage.app,VITE_FIREBASE_MESSAGING_SENDER_ID=1038395846432,VITE_FIREBASE_APP_ID=1:1038395846432:web:b41cc891379fd23db33145"
  ```

### What this command does:
1. **`--source .`**: Tells Cloud Build to package the current directory and build the Docker image in the cloud using the local `Dockerfile`.
2. **`--set-env-vars`**: Sets the runtime Express server variables (in this case, your `GEMINI_API_KEY`).
3. **`--set-build-env-vars`**: Passes your Firebase configuration variables as build arguments. Vite uses these during compilation (`npm run build`) to generate the static files in the `/dist` folder.
4. **`--allow-unauthenticated`**: Makes the service publicly accessible on the internet.

---

## Deployment Step 2: Set Firestore Security Rules (If not done)

Make sure you deploy your firestore security rules configurations so the database behaves correctly:

```bash
npx firebase-tools deploy --only firestore:rules --project vibe2ship-8914a
```

---

## Troubleshooting & Verification

### Local Docker Testing
If you have Docker running locally, you can verify the build configuration prior to deploying:

1. **Build the container** with your Firebase build args:
   ```bash
   docker build `
     --build-arg VITE_FIREBASE_API_KEY="AIzaSyDQyx2HdTIdJLCZVmYwEL_m5jnS3l2VoyA" `
     --build-arg VITE_FIREBASE_AUTH_DOMAIN="vibe2ship-8914a.firebaseapp.com" `
     --build-arg VITE_FIREBASE_PROJECT_ID="vibe2ship-8914a" `
     --build-arg VITE_FIREBASE_STORAGE_BUCKET="vibe2ship-8914a.firebasestorage.app" `
     --build-arg VITE_FIREBASE_MESSAGING_SENDER_ID="1038395846432" `
     --build-arg VITE_FIREBASE_APP_ID="1:1038395846432:web:b41cc891379fd23db33145" `
     -t vibe2ship .
   ```

2. **Run the container** locally to verify:
   ```bash
   docker run -p 8080:8080 -e GEMINI_API_KEY="AIzaSyDDvtviYSXSGodZDIdTEAvcrXTN2-K_ji0" vibe2ship
   ```
   Open `http://localhost:8080` in your web browser.
