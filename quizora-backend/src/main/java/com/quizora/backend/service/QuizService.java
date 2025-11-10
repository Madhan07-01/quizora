package com.quizora.backend.service;

import com.quizora.backend.model.Participant;
import com.quizora.backend.model.Question;
import com.quizora.backend.model.Quiz;
import com.quizora.backend.model.Submission;
import com.quizora.backend.repository.ParticipantRepository;
import com.quizora.backend.repository.QuizRepository;
import com.quizora.backend.repository.SubmissionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.*;

@Service
public class QuizService {

    private final QuizRepository quizRepository;
    private final ParticipantRepository participantRepository;
    private final SubmissionRepository submissionRepository;
    private final LeaderboardService leaderboardService;
    private final UserStatsService userStatsService;

    private static final char[] CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".toCharArray();
    private static final SecureRandom RAND = new SecureRandom();

    public QuizService(QuizRepository quizRepository,
                       ParticipantRepository participantRepository,
                       SubmissionRepository submissionRepository,
                       LeaderboardService leaderboardService,
                       UserStatsService userStatsService) {
        this.quizRepository = quizRepository;
        this.participantRepository = participantRepository;
        this.submissionRepository = submissionRepository;
        this.leaderboardService = leaderboardService;
        this.userStatsService = userStatsService;
    }

    private String generateUniqueCode() {
        String code;
        do {
            StringBuilder sb = new StringBuilder("QZ");
            for (int i = 0; i < 6; i++) {
                sb.append(CODE_CHARS[RAND.nextInt(CODE_CHARS.length)]);
            }
            code = sb.toString();
        } while (quizRepository.existsByQuizCode(code));
        return code;
    }

    @Transactional
    public Quiz createQuiz(Quiz quiz) {
        if (quiz.getQuestions() != null) {
            for (Question q : quiz.getQuestions()) {
                q.setQuiz(quiz);
            }
        }
        quiz.setQuizCode(generateUniqueCode());
        return quizRepository.save(quiz);
    }

    @Transactional(readOnly = true)
    public Optional<Quiz> getQuizByCode(String code) {
        return quizRepository.findByQuizCode(code);
    }

    @Transactional(readOnly = true)
    public List<Quiz> getAllQuizzes() {
        return quizRepository.findAll();
    }

    @Transactional
    public Optional<Quiz> registerParticipant(String code, String participantName) {
        Optional<Quiz> quizOpt = quizRepository.findByQuizCode(code);
        if (quizOpt.isEmpty()) return Optional.empty();
        Quiz quiz = quizOpt.get();
        participantRepository.findByQuizIdAndName(quiz.getId(), participantName)
                .orElseGet(() -> {
                    Participant p = new Participant();
                    p.setQuiz(quiz);
                    p.setName(participantName);
                    p.setJoinedAt(Instant.now());
                    return participantRepository.save(p);
                });
        return Optional.of(quiz);
    }

    public static class AnswerDTO {
        public Long questionId;
        public String selected; // A/B/C/D
    }

    @Transactional
    public Optional<Submission> submitAnswers(String quizCode, String participantName, List<AnswerDTO> answers, Integer durationSeconds, String uid) {
        System.out.println("[Submit] quizCode=" + quizCode + ", name=" + participantName + ", uid(token)=" + (uid==null?"null":uid));
        Optional<Quiz> quizOpt = quizRepository.findByQuizCode(quizCode);
        if (quizOpt.isEmpty()) return Optional.empty();
        Quiz quiz = quizOpt.get();

        Map<Long, String> selectedByQ = new HashMap<>();
        if (answers != null) {
            for (AnswerDTO a : answers) {
                if (a != null && a.questionId != null && a.selected != null) {
                    selectedByQ.put(a.questionId, a.selected);
                }
            }
        }

        int totalQuestions = quiz.getQuestions().size();
        int correct = 0;
        int score = 0;
        for (Question q : quiz.getQuestions()) {
            String sel = selectedByQ.get(q.getId());
            if (sel != null && sel.equalsIgnoreCase(q.getCorrectAnswer())) {
                correct++;
                Integer m = q.getMarks();
                int marks = (m != null ? m : 1);
                score += marks;
            }
        }

        // Create a new submission (multiple attempts allowed)
        Submission sub = new Submission();
        sub.setQuiz(quiz);
        sub.setParticipantName(participantName);
        sub.setTotalQuestions(totalQuestions);
        sub.setTotalCorrect(correct);
        sub.setTotalScore(score);
        sub.setDurationSeconds(durationSeconds != null ? durationSeconds : 0);
        sub.setSubmittedAt(Instant.now());
        submissionRepository.save(sub);

        // push to leaderboard (also mirrors to Firestore for realtime reads)
        leaderboardService.updateScore(quizCode, participantName, score, durationSeconds != null ? durationSeconds : 0, uid);

        // Resolve uid by display name if token missing (best-effort) then record attempt stats
        try {
            String effectiveUid = uid;
            if (effectiveUid == null || effectiveUid.isBlank()) {
                try { effectiveUid = userStatsService.resolveUidByName(participantName); } catch (Exception ignored) {}
            }
            if (effectiveUid != null && !effectiveUid.isBlank()) {
                System.out.println("[Submit] recordSubmission uid=" + effectiveUid + ", correct=" + correct + ", totalQ=" + totalQuestions);
                userStatsService.recordSubmission(effectiveUid, correct, totalQuestions);
                // Performance-based XP: percent * 100 with 10% bonus if >90% (cap 110)
                double percent = totalQuestions > 0 ? ((double) correct / (double) totalQuestions) : 0.0;
                double base = percent * 100.0;
                double withBonus = percent > 0.9 ? (base * 1.10) : base;
                long xpAward = Math.round(Math.min(withBonus, 110.0));
                System.out.println("[Submit] awardPerformance uid=" + effectiveUid + ", quizCode=" + quizCode + ", percent=" + percent + ", baseXp=" + Math.round(base) + ", xpWithBonus=" + xpAward);
                userStatsService.awardPerformance(effectiveUid, quizCode, xpAward, percent);
            }
        } catch (Exception ignored) {}
        return Optional.of(sub);
    }

    @Transactional(readOnly = true)
    public List<Participant> listParticipants(String quizCode) {
        Optional<Quiz> quizOpt = quizRepository.findByQuizCode(quizCode);
        if (quizOpt.isEmpty()) return Collections.emptyList();
        return participantRepository.findByQuizId(quizOpt.get().getId());
    }

    @Transactional(readOnly = true)
    public List<Submission> listResults(String quizCode) {
        Optional<Quiz> quizOpt = quizRepository.findByQuizCode(quizCode);
        if (quizOpt.isEmpty()) return Collections.emptyList();
        List<Submission> list = submissionRepository.findByQuizId(quizOpt.get().getId());
        // Keep only the latest attempt per participant
        Map<String, Submission> latestByName = new HashMap<>();
        for (Submission s : list) {
            Submission cur = latestByName.get(s.getParticipantName());
            if (cur == null || (s.getSubmittedAt() != null && s.getSubmittedAt().isAfter(cur.getSubmittedAt()))) {
                latestByName.put(s.getParticipantName(), s);
            }
        }
        List<Submission> uniqueLatest = new ArrayList<>(latestByName.values());
        uniqueLatest.sort(Comparator.comparing(Submission::getTotalScore).reversed()
                .thenComparing(Submission::getDurationSeconds));
        return uniqueLatest;
    }

    @Transactional
    public void deleteQuiz(Long id) {
        quizRepository.deleteById(id);
    }
}
