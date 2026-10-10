# Google Login integration

These files are intended for your existing React website and reuse the login CSS classes found in your uploaded stylesheet.

## 1. Install dependencies

```bash
npm install firebase lucide-react
```

## 2. Configure Firebase

1. Open https://console.firebase.google.com/ and create/select your project.
2. Add a Web app and copy its Firebase config into `firebase.js`.
3. Go to **Authentication → Sign-in method** and enable **Google**.
4. Under **Authentication → Settings → Authorized domains**, add your development and production domains.

Do not put service-account credentials or private keys in frontend code. The Firebase web config is designed for client-side use; configure Firebase security rules for any database you add.

## 3. Use the page

Import `GoogleLoginPage` where your app currently decides whether to show the login screen:

```jsx
import GoogleLoginPage from "./GoogleLoginPage";

function App() {
  return (
    <GoogleLoginPage
      onLoginSuccess={(user) => {
        console.log("Signed in:", user.uid);
        // Replace this with your existing authenticated-home navigation/state.
      }}
      onGuestContinue={() => {
        // Replace this with your existing guest flow.
      }}
    />
  );
}

export default App;
```

Keep your existing stylesheet imported so its `.login-screen`, `.login-art`, `.login-panel`, `.brand`, `.guest-button`, `.primary-button`, and `.or-divider` rules apply.

## Important

The provided upload contains CSS only, so this component is a drop-in starting point rather than a complete patch to your app's routing/auth state. Replace the example callbacks with your existing navigation logic and keep any existing brand name/text if it differs.
