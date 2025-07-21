rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper function to check if the user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }

    // Helper function to get the current user's UID
    function getUserId() {
      return request.auth.uid;
    }

    // Helper function to check if the current user is an admin
    // This now correctly points to the path used by AdminPage.jsx
    function isAdmin() {
      // Use the actual path where AdminPage.jsx stores the userProfile with the role
      return isAuthenticated() &&
             get(/databases/$(database)/documents/artifacts/booking-app-1af02/users/$(getUserId())/profiles/userProfile).data.role == 'admin';
    }

    // Rule for the top-level 'users' collection (if you still use it for something else, e.g., basic user info)
    // If this collection only contains the basic user ID and you rely on userProfile for roles,
    // you might keep this rule simple or even remove this match block if not strictly needed.
    // However, if you are explicitly storing role here as well, ensure consistency.
    match /users/{userId} {
      allow read, write: if isAuthenticated() && getUserId() == userId;
    }

    // Match any document within your specific application's data path
    match /artifacts/{appId} {

      // Rule for user-specific private data: user profiles under artifacts.
      // Users can read/write their own profile.
      match /users/{userId}/profiles/userProfile {
        allow read, write: if isAuthenticated() && getUserId() == userId;
        // Admins should also be able to read all user profiles if needed for admin functions
        // allow read: if isAdmin(); // Uncomment if admins need to read all user profiles
      }

      // Specific rule for individual user bookings.
      // A user can read, create, update, delete their OWN bookings.
      // Admins can also read, update, delete these specific bookings.
      match /users/{userId}/bookings/{bookingId} {
        allow read, create, update, delete: if isAuthenticated() && getUserId() == userId;
        // Additionally, allow an admin to read, update, or delete any specific booking.
        allow read, update, delete: if isAdmin(); // <--- This now uses the corrected isAdmin()
      }

      // Collection Group rule for 'bookings' subcollections.
      // This rule is crucial for the AdminPage's `collectionGroup(db, 'bookings')` query,
      // allowing it to fetch all booking documents across all users.
      match /{path=**}/bookings/{bookingId} {
        // Only admins can read all bookings via collectionGroup queries.
        allow read: if isAdmin(); // <--- This now uses the corrected isAdmin()

        // Only admins can create, update, or delete any booking.
        allow create, update, delete: if isAdmin(); // <--- This now uses the corrected isAdmin()
      }
    }
  }
}