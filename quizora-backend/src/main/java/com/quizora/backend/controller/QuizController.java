package com.quizora.backend.controller;

import com.quizora.backend.model.Quiz;
import com.quizora.backend.service.QuizService;
import com.quizora.backend.repository.QuizRepository;
import com.quizora.backend.repository.ParticipantRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import com.google.firebase.cloud.FirestoreClient;
import com.google.cloud.firestore.Firestore;

@RestController
@RequestMapping("/api/quizzes")
public class QuizController {

    private final QuizService quizService;
    private final QuizRepository quizRepository;
    private final ParticipantRepository participantRepository;

    public QuizController(QuizService quizService, QuizRepository quizRepository, ParticipantRepository participantRepository) {
        this.quizService = quizService;
        this.quizRepository = quizRepository;
        this.participantRepository = participantRepository;
    }

    @PostMapping("/create")
    public ResponseEntity<Map<String, Object>> createQuiz(@Valid @RequestBody Quiz quiz) {
        Quiz created = quizService.createQuiz(quiz);
        Map<String, Object> resp = new HashMap<>();
        resp.put("quizCode", created.getQuizCode());
        resp.put("id", created.getId());
        return ResponseEntity.ok(resp);
    }

    @GetMapping("/code/{quizCode}")
    public ResponseEntity<Quiz> getByCode(@PathVariable String quizCode) {
        return quizService.getQuizByCode(quizCode)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/all")
    public ResponseEntity<List<Quiz>> getAll() {
        return ResponseEntity.ok(quizService.getAllQuizzes());
    }

    // Debug: fetch Firestore user stats with Authorization
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

    public static class JoinRequest { public String quizCode; public String name; }

    @PostMapping("/join")
    public ResponseEntity<?> join(@RequestBody JoinRequest req) {
        if (req == null || req.quizCode == null || req.quizCode.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error","quizCode is required"));
        }
        return quizService.registerParticipant(req.quizCode, req.name)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElse(ResponseEntity.status(404).body(Map.of("error","Invalid quiz code")));
    }

    @DeleteMapping("/delete/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        quizService.deleteQuiz(id);
        return ResponseEntity.noContent().build();
    }

    // Submit answers and compute results
    public static class SubmitRequest {
        public String quizCode;
        public String name;
        public Integer durationSeconds;
        public List<QuizService.AnswerDTO> answers;
    }

    @PostMapping("/submit")
    public ResponseEntity<?> submit(@RequestBody SubmitRequest req, HttpServletRequest httpReq) {
        if (req == null || req.quizCode == null || req.quizCode.isBlank() || req.name == null || req.name.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error","quizCode and name are required"));
        }
        String uid = (String) httpReq.getAttribute("firebaseUid");
        return quizService.submitAnswers(req.quizCode, req.name, req.answers, req.durationSeconds, uid)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElse(ResponseEntity.status(404).body(Map.of("error","Invalid quiz code")));
    }

    @GetMapping("/{quizCode}/participants")
    public ResponseEntity<?> participants(@PathVariable String quizCode) {
        return ResponseEntity.ok(quizService.listParticipants(quizCode));
    }

    @GetMapping("/{quizCode}/results")
    public ResponseEntity<?> results(@PathVariable String quizCode) {
        return ResponseEntity.ok(quizService.listResults(quizCode));
    }

    public record LeaderboardRow(String name, int score, int durationSeconds, int rank) {}

    @GetMapping("/{quizCode}/leaderboard")
    public ResponseEntity<?> leaderboard(@PathVariable String quizCode) {
        var list = quizService.listResults(quizCode);
        // Already sorted by score desc, duration asc in service
        int[] rank = {0};
        int[] lastScore = {Integer.MIN_VALUE};
        int[] lastDuration = {Integer.MIN_VALUE};
        int[] position = {0};
        var dto = list.stream().map(sub -> {
            position[0]++;
            int currentScore = sub.getTotalScore();
            int currentDuration = sub.getDurationSeconds();
            if (currentScore != lastScore[0] || currentDuration != lastDuration[0]) {
                rank[0] = position[0];
                lastScore[0] = currentScore;
                lastDuration[0] = currentDuration;
            }
            return new LeaderboardRow(sub.getParticipantName(), currentScore, currentDuration, rank[0]);
        }).toList();
        return ResponseEntity.ok(dto);
    }

    public record CreatedQuizRow(Long id, String title, String quizCode, String createdAt, long participants) {}

    @GetMapping("/users/{uid}/quizzes")
    public ResponseEntity<?> createdQuizzes(@PathVariable String uid) {
        var list = quizRepository.findByCreatorUidOrderByCreatedAtDesc(uid);
        var dto = list.stream().map(q -> new CreatedQuizRow(
                q.getId(),
                q.getTitle(),
                q.getQuizCode(),
                q.getCreatedAt() != null ? q.getCreatedAt().toString() : null,
                participantRepository.countByQuizId(q.getId())
        )).toList();
        return ResponseEntity.ok(dto);
    }
}
