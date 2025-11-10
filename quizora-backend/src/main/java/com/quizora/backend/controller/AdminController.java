package com.quizora.backend.controller;

import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.firebase.cloud.FirestoreClient;
import com.quizora.backend.model.Quiz;
import com.quizora.backend.model.Submission;
import com.quizora.backend.repository.QuizRepository;
import com.quizora.backend.service.QuizService;
import com.quizora.backend.service.UserStatsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final QuizRepository quizRepository;
    private final QuizService quizService;
    private final UserStatsService userStatsService;

    public AdminController(QuizRepository quizRepository, QuizService quizService, UserStatsService userStatsService) {
        this.quizRepository = quizRepository;
        this.quizService = quizService;
        this.userStatsService = userStatsService;
    }

    public record BackfillRequest(String quizCode) {}

    @GetMapping("/ping")
    public ResponseEntity<?> ping() {
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @GetMapping("/user-stats/{uid}")
    public ResponseEntity<?> userStats(@PathVariable String uid) {
        try {
            Firestore db = FirestoreClient.getFirestore();
            var userSnap = db.collection("users").document(uid).get().get();
            Map<String, Object> result = new HashMap<>();
            result.put("user", userSnap.exists() ? userSnap.getData() : null);
            var awards = db.collection("users").document(uid).collection("awards").get().get();
            result.put("awards", awards.getDocuments().stream().map(d -> {
                Map<String, Object> m = new HashMap<>(d.getData());
                m.put("id", d.getId());
                return m;
            }).toList());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/recompute/{uid}")
    public ResponseEntity<?> recompute(@PathVariable String uid) {
        try {
            userStatsService.recomputeAggregates(uid);
            Firestore db = FirestoreClient.getFirestore();
            var userSnap = db.collection("users").document(uid).get().get();
            Map<String, Object> result = new HashMap<>();
            result.put("user", userSnap.exists() ? userSnap.getData() : null);
            var awards = db.collection("users").document(uid).collection("awards").get().get();
            result.put("awards", awards.getDocuments().stream().map(d -> {
                Map<String, Object> m = new HashMap<>(d.getData());
                m.put("id", d.getId());
                return m;
            }).toList());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/backfill-awards")
    public ResponseEntity<?> backfill(@RequestBody(required = false) BackfillRequest req) {
        return doBackfill(req != null ? req.quizCode() : null);
    }

    @GetMapping("/backfill-awards")
    public ResponseEntity<?> backfillAll() {
        return doBackfill(null);
    }

    @GetMapping("/backfill-awards/{quizCode}")
    public ResponseEntity<?> backfillOne(@PathVariable String quizCode) {
        return doBackfill(quizCode);
    }

    private ResponseEntity<?> doBackfill(String quizCode) {
        List<String> processed = new ArrayList<>();
        List<String> skipped = new ArrayList<>();
        try {
            Firestore db = FirestoreClient.getFirestore();
            // Build a name->uid multimap to cautiously resolve users by display name
            Map<String, String> nameToUid = new HashMap<>();
            Map<String, Integer> nameCounts = new HashMap<>();
            try {
                var usersSnap = db.collection("users").get().get();
                for (var d : usersSnap.getDocuments()) {
                    String uid = d.getId();
                    Object n = d.get("name");
                    if (uid != null && n instanceof String s && !s.isBlank()) {
                        String key = s.trim().toLowerCase();
                        // If duplicate names exist, mark as ambiguous by increasing count
                        nameCounts.put(key, nameCounts.getOrDefault(key, 0) + 1);
                        // store first uid; will check count later
                        nameToUid.putIfAbsent(key, uid);
                    }
                }
            } catch (Exception ignored) {}
            List<Quiz> targets;
            if (quizCode != null && !quizCode.isBlank()) {
                targets = quizRepository.findByQuizCode(quizCode).map(List::of).orElse(List.of());
            } else {
                targets = quizRepository.findAll();
            }
            for (Quiz q : targets) {
                String code = q.getQuizCode();
                if (code == null || code.isBlank()) continue;
                // Compute ranked results using latest attempts
                List<Submission> ranked = quizService.listResults(code);
                int[] rankPtr = {0};
                int[] lastScore = {Integer.MIN_VALUE};
                int[] lastDur = {Integer.MIN_VALUE};
                int[] pos = {0};
                for (Submission s : ranked) {
                    pos[0]++;
                    int sc = s.getTotalScore();
                    int dur = s.getDurationSeconds();
                    if (sc != lastScore[0] || dur != lastDur[0]) {
                        rankPtr[0] = pos[0];
                        lastScore[0] = sc;
                        lastDur[0] = dur;
                    }
                    String name = s.getParticipantName();
                    String uid = null;
                    try {
                        DocumentSnapshot entry = db.collection("leaderboards").document(code)
                                .collection("entries").document(name).get().get();
                        if (entry.exists()) {
                            Object u = entry.get("uid");
                            if (u instanceof String us && !us.isBlank()) uid = us;
                        }
                    } catch (Exception ignored) {}
                    // try resolving by unique display name if uid still null
                    if (uid == null && name != null && !name.isBlank()) {
                        String key = name.trim().toLowerCase();
                        Integer c = nameCounts.get(key);
                        if (c != null && c == 1) {
                            uid = nameToUid.get(key);
                        }
                    }
                    if (uid != null) {
                        userStatsService.awardIfNotAwarded(uid, code, rankPtr[0]);
                        processed.add(code + ":" + uid + "#" + rankPtr[0]);
                    } else {
                        skipped.add(code + ":" + (name != null ? name : "-") );
                    }
                }
            }
            return ResponseEntity.ok(Map.of(
                    "processed", processed,
                    "skipped", skipped
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                    "error", e.getMessage(),
                    "processed", processed,
                    "skipped", skipped
            ));
        }
    }
}
