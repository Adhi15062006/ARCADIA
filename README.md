# Arcadia Digital

An elite digital engineering and custom software agency web platform. This is a full-stack production-ready React, Express, and Firebase application configured with automated admin controls, secure payment logs, dynamic chatbot interactions, and responsive custom-styled invoice generation.

## 🌟 Key Features

- **Full-Stack Enterprise Hub**: Built using a modern React 19 SPA frontend integrated seamlessly with an Express serverless backend proxy for maximum security.
- **Client & Admin Dashboards**: Dynamic client tracking, billing panels, staff-level tools, and system logs.
- **Secure Authentication**: Native integration with Firebase Authentication and JSON Web Tokens (JWT) for multi-tiered role authorization.
- **Durable Persistence**: Utilizes Cloud Firestore for real-time document stores, audit logging, and transactional persistence.
- **Direct Checkout & Payments**: Native support for digital transaction processing, order lifecycle events, and automated PDF receipt dispatching.
- **Interactive Conversational UI**: Fully secured server-side API proxy routing for real-time chatbot interaction without exposing client-side credentials.
- **Enterprise PDF Generation**: Dynamic client receipts, invoices, and service scopes generated using `jspdf`.

## ⚙️ Prerequisites

Before you run or deploy this application, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18.x or later recommended)
- [npm](https://www.npmjs.com/) (v9.x or later)

---

## 🛠️ Local Development & Installation

### 1. Clone & Install Dependencies
First, clone the repository and run the package installer:
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env.local` file in the root directory and add the following configuration values (do not commit this file to public version control):

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
VITE_FIREBASE_DATABASE_ID=your_firestore_db_id

# Admin Controls
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your_secure_password_here
JWT_SECRET=your_super_secure_jwt_secret_key

# Third-Party API Credentials (Optional)
VITE_RESEND_API_KEY=your_resend_api_key
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
GEMINI_API_KEY=your_google_gemini_api_key
```

### 3. Run Development Server
To boot the full-stack system in development mode (with hot reloading and dev-middleware support):
```bash
npm run dev
```
The server will start running on [http://localhost:3000](http://localhost:3000).

---

## 🏗️ Building for Production

To compile and bundle the static client SPA and package the Express server entry point for a production environment:

```bash
npm run build
```

This command will output:
1. Static client assets inside the `dist/` directory.
2. A bundled, self-contained server script inside `dist/server.cjs` for streamlined runtime execution.

### Preview Build Locally
To test the production build locally before uploading to hosting providers:
```bash
npm run start
```

---

## 🔥 Firebase Database & Rules Setup

1. Enable **Cloud Firestore** and **Authentication** in your Firebase Console.
2. Configure your security rules to match the included `firestore.rules` file:
   ```bash
   # Deploy Firestore rules if using Firebase CLI
   firebase deploy --only firestore:rules
   ```

---

## 🚀 Vercel Production Deployment

This project is fully pre-configured for **Vercel Serverless hosting** using the custom routing in `vercel.json` and a serverless entry handler in `/api/index.ts`.

### Automated Deployment Steps
1. Push your repository to your GitHub account.
2. Go to the [Vercel Dashboard](https://vercel.com/) and click **Add New Project**.
3. Import your GitHub repository.
4. Set the following Build Options:
   - **Framework Preset**: Vite / Other (Auto-detected)
   - **Root Directory**: `.` (Project Root)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
5. Click **Environment Variables** and copy all key-value entries from your local configuration.
6. Click **Deploy**.

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for more details.
