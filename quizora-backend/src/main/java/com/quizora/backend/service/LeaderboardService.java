package com.quizora.backend.service;

import com.google.firebase.FirebaseApp;
import com.google.firebase.database.DatabaseReference;
import com.google.firebase.database.FirebaseDatabase;
import org.springframework.beans.factory.annotation.Value;
import com.google.cloud.firestore.Firestore;
import com.google.firebase.cloud.FirestoreClient;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
public class LeaderboardService {
    @Value("${app.firebase.database-url:}")
    private String rtdbUrl;
    public void updateScore(String quizCode, String username, int score, int durationSeconds, String uid) {
        try {
            if (FirebaseApp.getApps() == null || FirebaseApp.getApps().isEmpty()) return; // Admin not initialized
        } catch (IllegalStateException ignored) { return; }

        // Optional: push to Realtime Database (legacy). Only if a valid URL is configured.
        try {
            if (rtdbUrl != null && !rtdbUrl.isBlank()) {
                DatabaseReference ref = FirebaseDatabase
                        .getInstance()
                        .getReference("leaderboards")
                        .child(quizCode)
                        .child(username);
                ref.setValueAsync(score);
            }
        } catch (Throwable ignored) {}

        // Firestore mirror for realtime leaderboard reads
        try {
            Firestore db = FirestoreClient.getFirestore();
            Map<String, Object> data = new HashMap<>();
            data.put("name", username);
            data.put("score", score);
            data.put("durationSeconds", durationSeconds);
            if (uid != null && !uid.isBlank()) data.put("uid", uid);
            db.collection("leaderboards")
                    .document(quizCode)
                    .collection("entries")
                    .document(username)
                    .set(data);
        } catch (Throwable ignored) {}
    }
}
