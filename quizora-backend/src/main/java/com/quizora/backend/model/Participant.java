package com.quizora.backend.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "participants", uniqueConstraints = {
        @UniqueConstraint(name = "uk_quiz_participant_name", columnNames = {"quiz_id", "name"})
})
public class Participant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "quiz_id")
    private Quiz quiz;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private Instant joinedAt;

    @PrePersist
    public void onJoin() {
        if (joinedAt == null) joinedAt = Instant.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Quiz getQuiz() { return quiz; }
    public void setQuiz(Quiz quiz) { this.quiz = quiz; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public Instant getJoinedAt() { return joinedAt; }
    public void setJoinedAt(Instant joinedAt) { this.joinedAt = joinedAt; }
}
