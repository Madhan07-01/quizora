package com.quizora.backend.service;

import com.google.firebase.FirebaseApp;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.firebase.cloud.FirestoreClient;
import com.quizora.backend.model.Quiz;
import com.quizora.backend.repository.QuizRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Optional;

@Service
public class FirestoreSyncService {

    private final QuizRepository quizRepository;

    public FirestoreSyncService(QuizRepository quizRepository) {
        this.quizRepository = quizRepository;
    }

    @PostConstruct
    public void start() {
        try {
            if (FirebaseApp.getApps() == null || FirebaseApp.getApps().isEmpty()) return; // Admin not initialized
        } catch (IllegalStateException ignored) { return; }
        try {
            Firestore db = FirestoreClient.getFirestore();
            db.collection("quizzes").addSnapshotListener((snapshots, e) -> {
                if (e != null || snapshots == null) return;
                for (DocumentSnapshot doc : snapshots.getDocuments()) {
                    try { upsertQuizFromDoc(doc); } catch (Exception ignored) {}
                }
            });
            System.out.println("[Sync] Firestore->Postgres quiz sync listener started");
        } catch (Exception ex) {
            System.err.println("[Sync] Failed to start Firestore listener: " + ex.getMessage());
        }
    }

    private void upsertQuizFromDoc(DocumentSnapshot doc) {
        if (doc == null || !doc.exists()) return;
        Map<String, Object> m = doc.getData();
        if (m == null) return;
        String quizCode = doc.getId();
        String title = asString(m.get("title"));
        String description = asString(m.get("description"));
        String difficulty = asString(m.get("difficulty"));
        Integer sessionTimer = asInt(m.get("sessionTimer"));
        String creatorUid = asString(m.get("creatorUid"));
        String creatorName = asString(m.get("creatorName"));

        Optional<Quiz> existing = quizRepository.findByQuizCode(quizCode);
        Quiz q = existing.orElseGet(Quiz::new);
        if (existing.isEmpty()) q.setQuizCode(quizCode);
        if (title != null) q.setTitle(title);
        if (description != null) q.setDescription(description);
        if (difficulty != null) q.setDifficulty(difficulty);
        if (sessionTimer != null) q.setSessionTimer(sessionTimer);
        if (creatorUid != null) q.setCreatorUid(creatorUid);
        if (creatorName != null) q.setCreatorName(creatorName);
        quizRepository.save(q);
    }

    private String asString(Object o) { return o != null ? o.toString() : null; }
    private Integer asInt(Object o) {
        if (o == null) return null;
        if (o instanceof Number n) return n.intValue();
        try {
            if (o instanceof String s) return Integer.parseInt(s);
            return Integer.parseInt(o.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
