package com.quizora.backend.service;

import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.Query;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.firebase.FirebaseApp;
import com.google.firebase.cloud.FirestoreClient;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@Service
public class UserStatsService {

    public void awardIfNotAwarded(String uid, String quizCode, int rank) {
        if (uid == null || uid.isBlank()) return;
        try {
            if (FirebaseApp.getApps() == null || FirebaseApp.getApps().isEmpty()) return;
        } catch (IllegalStateException ignored) { return; }

        try {
            Firestore db = FirestoreClient.getFirestore();
            DocumentReference awardsRef = db.collection("users").document(uid)
                    .collection("awards").document(quizCode);

            // Idempotent: if award doc exists, skip
            var snap = awardsRef.get().get();
            if (snap.exists()) return;

            int xp = Math.max(10 - (rank - 1), 1); // 1st=10, 2nd=9, ...
            String badge = rank == 1 ? "Gold" : rank == 2 ? "Silver" : rank == 3 ? "Bronze" : "Participant";

            Map<String, Object> award = new HashMap<>();
            award.put("quizCode", quizCode);
            award.put("rank", rank);
            award.put("xp", xp);
            award.put("badge", badge);
            award.put("awardedAt", Instant.now().toString());

            // Write award doc, then aggregate fields atomically via transaction
            db.runTransaction(tx -> {
                tx.set(awardsRef, award);
                DocumentReference userRef = db.collection("users").document(uid);
                var userSnap = tx.get(userRef).get();
                long totalXp = 0;
                long xpLegacy = 0;
                long badges = 0;
                if (userSnap.exists()) {
                    Object oxp = userSnap.get("totalXp");
                    if (oxp instanceof Number n) totalXp = n.longValue();
                    Object oLegacy = userSnap.get("xp");
                    if (oLegacy instanceof Number n) xpLegacy = n.longValue();
                    Object ob = userSnap.get("badgesCount");
                    if (ob instanceof Number n) badges = n.longValue();
                }
                Map<String, Object> inc = new HashMap<>();
                inc.put("totalXp", totalXp + xp);
                inc.put("xp", xpLegacy + xp);
                inc.put("badgesCount", badges + 1);
                tx.set(userRef, inc, com.google.cloud.firestore.SetOptions.merge());
                return null;
            }).get();
        } catch (Exception ignored) {}
    }

    /**
     * Award XP based on performance for a given quiz attempt. Idempotent per (uid, quizCode).
     * Stores an award document with xp and percent, and increments user's xp/totalXp.
     * Also assigns a "Speed Learner" badge on this award if percent >= 0.9.
     */
    public void awardPerformance(String uid, String quizCode, long xp, double percent) {
        if (uid == null || uid.isBlank()) return;
        try {
            if (FirebaseApp.getApps() == null || FirebaseApp.getApps().isEmpty()) {
                System.out.println("[Award] Firebase not initialized; skipping awardPerformance uid=" + uid + ", quizCode=" + quizCode);
                return;
            }
        } catch (IllegalStateException ignored) { 
            System.out.println("[Award] IllegalStateException on Firebase apps; skipping awardPerformance uid=" + uid + ", quizCode=" + quizCode);
            return; 
        }
        try {
            Firestore db = FirestoreClient.getFirestore();
            DocumentReference awardsRef = db.collection("users").document(uid)
                    .collection("awards").document(quizCode);
            System.out.println("[Award] awardPerformance ENTER uid=" + uid + ", quizCode=" + quizCode + ", xp=" + xp + ", percent=" + percent);
            // Existence check will be performed inside the transaction to avoid read/write ordering issues

            String badge = percent >= 0.9 ? "Speed Learner" : "";
            Map<String, Object> award = new HashMap<>();
            award.put("quizCode", quizCode);
            award.put("xp", xp);
            award.put("percent", percent);
            if (!badge.isBlank()) award.put("badge", badge);
            award.put("awardedAt", Instant.now().toString());

            db.runTransaction(tx -> {
                DocumentReference userRef = db.collection("users").document(uid);
                // READS must occur before any WRITES in a Firestore transaction
                var awardSnap = tx.get(awardsRef).get();
                if (awardSnap.exists()) {
                    System.out.println("[Award] awardPerformance SKIP existing award uid=" + uid + ", quizCode=" + quizCode);
                    return null;
                }
                var userSnap = tx.get(userRef).get();
                long totalXp = 0;
                long xpLegacy = 0;
                long badges = 0;
                if (userSnap.exists()) {
                    Object oxp = userSnap.get("totalXp");
                    if (oxp instanceof Number n) totalXp = n.longValue();
                    Object oLegacy = userSnap.get("xp");
                    if (oLegacy instanceof Number n) xpLegacy = n.longValue();
                    Object ob = userSnap.get("badgesCount");
                    if (ob instanceof Number n) badges = n.longValue();
                }
                Map<String, Object> inc = new HashMap<>();
                inc.put("totalXp", totalXp + xp);
                inc.put("xp", xpLegacy + xp);
                if (!badge.isBlank()) {
                    inc.put("badgesCount", badges + 1);
                }
                // WRITES after all reads
                tx.set(awardsRef, award);
                tx.set(userRef, inc, com.google.cloud.firestore.SetOptions.merge());
                return null;
            }).get();
            System.out.println("[Award] awardPerformance OK uid=" + uid + ", quizCode=" + quizCode + ", xp=" + xp + ", badge=" + (badge.isBlank()?"-":badge));
        } catch (Exception e) {
            System.out.println("[Award] awardPerformance ERROR uid=" + uid + ", quizCode=" + quizCode + ": " + e.getMessage());
            // Fallback: attempt non-transactional, idempotent writes
            try {
                Firestore db = FirestoreClient.getFirestore();
                DocumentReference awardsRef = db.collection("users").document(uid)
                        .collection("awards").document(quizCode);
                DocumentReference userRef = db.collection("users").document(uid);

                // Rebuild award payload locally
                String fbBadge = percent >= 0.9 ? "Speed Learner" : "";
                Map<String, Object> fbAward = new HashMap<>();
                fbAward.put("quizCode", quizCode);
                fbAward.put("xp", xp);
                fbAward.put("percent", percent);
                if (!fbBadge.isBlank()) fbAward.put("badge", fbBadge);
                fbAward.put("awardedAt", Instant.now().toString());

                // Try to create the award document only if it does not exist
                try {
                    awardsRef.create(fbAward).get();
                    System.out.println("[Award] Fallback CREATE award OK uid=" + uid + ", quizCode=" + quizCode);
                } catch (Exception ce) {
                    // If already exists or create failed for existing, log and continue
                    System.out.println("[Award] Fallback SKIP/CREATE failed (may exist) uid=" + uid + ", quizCode=" + quizCode + ": " + ce.getMessage());
                }

                // Increment totals using atomic increments (works whether doc exists or not when used with merge)
                Map<String, Object> inc = new HashMap<>();
                inc.put("totalXp", com.google.cloud.firestore.FieldValue.increment(xp));
                inc.put("xp", com.google.cloud.firestore.FieldValue.increment(xp));
                if (!fbBadge.isBlank()) {
                    inc.put("badgesCount", com.google.cloud.firestore.FieldValue.increment(1));
                }
                userRef.set(inc, com.google.cloud.firestore.SetOptions.merge()).get();
                System.out.println("[Award] Fallback INCREMENT user totals OK uid=" + uid + ", xp=" + xp + ", badge=" + (fbBadge.isBlank()?"-":fbBadge));
            } catch (Exception fe) {
                System.out.println("[Award] Fallback ERROR uid=" + uid + ", quizCode=" + quizCode + ": " + fe.getMessage());
            }
        }
    }

    /** Ensure the XP Master milestone badge (1000+ totalXp). Creates a special award doc if missing. */
    public void ensureXpMasterBadge(String uid) {
        if (uid == null || uid.isBlank()) return;
        try {
            if (FirebaseApp.getApps() == null || FirebaseApp.getApps().isEmpty()) return;
        } catch (IllegalStateException ignored) { return; }
        try {
            Firestore db = FirestoreClient.getFirestore();
            var userRef = db.collection("users").document(uid);
            var userSnap = userRef.get().get();
            long totalXp = 0L;
            if (userSnap.exists()) {
                Object oxp = userSnap.get("totalXp");
                if (oxp instanceof Number n) totalXp = n.longValue();
            }
            if (totalXp < 1000) return;
            DocumentReference badgeRef = db.collection("users").document(uid)
                    .collection("awards").document("badge_xp_master");
            var bSnap = badgeRef.get().get();
            if (bSnap.exists()) return;
            Map<String, Object> award = new HashMap<>();
            award.put("badge", "XP Master");
            award.put("xp", 0);
            award.put("awardedAt", Instant.now().toString());
            db.runTransaction(tx -> {
                tx.set(badgeRef, award);
                var us = tx.get(userRef).get();
                long badges = 0L;
                if (us.exists()) {
                    Object ob = us.get("badgesCount");
                    if (ob instanceof Number n) badges = n.longValue();
                }
                Map<String, Object> inc = new HashMap<>();
                inc.put("badgesCount", badges + 1);
                tx.set(userRef, inc, com.google.cloud.firestore.SetOptions.merge());
                return null;
            }).get();
        } catch (Exception ignored) {}
    }

    public void recomputeAggregates(String uid) {
        if (uid == null || uid.isBlank()) return;
        try {
            if (FirebaseApp.getApps() == null || FirebaseApp.getApps().isEmpty()) return;
        } catch (IllegalStateException ignored) { return; }
        try {
            Firestore db = FirestoreClient.getFirestore();
            var awards = db.collection("users").document(uid).collection("awards").get().get();
            long xpSum = 0L;
            long badges = 0L;
            for (var d : awards.getDocuments()) {
                Object oxp = d.get("xp");
                if (oxp instanceof Number n) xpSum += n.longValue();
                badges++;
            }
            var userRef = db.collection("users").document(uid);
            Map<String, Object> data = new HashMap<>();
            data.put("xp", xpSum);
            data.put("totalXp", xpSum);
            data.put("badgesCount", badges);
            db.runTransaction(tx -> { tx.set(userRef, data, com.google.cloud.firestore.SetOptions.merge()); return null; }).get();
        } catch (Exception ignored) {}
    }
    public void recordSubmission(String uid, int totalCorrect, int totalQuestions) {
        if (uid == null || uid.isBlank()) return;
        try {
            if (FirebaseApp.getApps() == null || FirebaseApp.getApps().isEmpty()) return;
        } catch (IllegalStateException ignored) { return; }
        try {
            Firestore db = FirestoreClient.getFirestore();
            DocumentReference userRef = db.collection("users").document(uid);
            Map<String, Object> inc = new HashMap<>();
            // increment counters (attempt-based)
            inc.put("quizzesPlayed", com.google.cloud.firestore.FieldValue.increment(1));
            inc.put("totalCorrect", com.google.cloud.firestore.FieldValue.increment(totalCorrect));
            inc.put("totalQuestions", com.google.cloud.firestore.FieldValue.increment(totalQuestions));
            db.runTransaction(tx -> {
                tx.set(userRef, inc, com.google.cloud.firestore.SetOptions.merge());
                return null;
            }).get();
        } catch (Exception ignored) {}
    }

    /**
     * Resolve a user's uid by exact display name match (case-insensitive).
     * Returns null if none or multiple matches are found.
     */
    public String resolveUidByName(String displayName) {
        if (displayName == null || displayName.isBlank()) return null;
        try {
            if (FirebaseApp.getApps() == null || FirebaseApp.getApps().isEmpty()) return null;
        } catch (IllegalStateException ignored) { return null; }
        try {
            Firestore db = FirestoreClient.getFirestore();
            String target = displayName.trim().toLowerCase();
            Query q = db.collection("users").whereGreaterThanOrEqualTo("name", displayName)
                    .whereLessThan("name", displayName + "\uf8ff");
            var snap = q.get().get();
            String found = null;
            for (QueryDocumentSnapshot doc : snap.getDocuments()) {
                Object n = doc.get("name");
                String name = n != null ? n.toString() : null;
                if (name != null && name.trim().equalsIgnoreCase(target)) {
                    if (found != null && !found.equals(doc.getId())) {
                        return null; // multiple
                    }
                    found = doc.getId();
                }
            }
            return found;
        } catch (Exception ignored) { return null; }
    }
}
