package com.quizora.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@JsonIgnoreProperties(ignoreUnknown = true)
@Table(name = "quizzes", indexes = {
        @Index(name = "idx_quiz_code_unique", columnList = "quizCode", unique = true),
        @Index(name = "idx_quiz_creator", columnList = "creatorUid")
})
public class Quiz {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;
    @Column(length = 2000)
    private String description;
    private String difficulty;
    private Integer sessionTimer; // minutes (optional)

    @Column(nullable = false, unique = true)
    private String quizCode;

    private Instant createdAt;

    // Creator (from Firebase Auth)
    private String creatorUid;
    private String creatorName;

    @OneToMany(mappedBy = "quiz", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JsonManagedReference
    private final List<Question> questions = new ArrayList<>();

    @PrePersist
    public void onCreate() {
        this.createdAt = Instant.now();
    }

    // getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getDifficulty() { return difficulty; }
    public void setDifficulty(String difficulty) { this.difficulty = difficulty; }

    public Integer getSessionTimer() { return sessionTimer; }
    public void setSessionTimer(Integer sessionTimer) { this.sessionTimer = sessionTimer; }

    public String getQuizCode() { return quizCode; }
    public void setQuizCode(String quizCode) { this.quizCode = quizCode; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public String getCreatorUid() { return creatorUid; }
    public void setCreatorUid(String creatorUid) { this.creatorUid = creatorUid; }

    public String getCreatorName() { return creatorName; }
    public void setCreatorName(String creatorName) { this.creatorName = creatorName; }

    public List<Question> getQuestions() { return questions; }
    public void setQuestions(List<Question> questions) {
        this.questions.clear();
        if (questions != null) {
            questions.forEach(this::addQuestion);
        }
    }

    public void addQuestion(Question q) {
        q.setQuiz(this);
        this.questions.add(q);
    }

    public void removeQuestion(Question q) {
        q.setQuiz(null);
        this.questions.remove(q);
    }
}
