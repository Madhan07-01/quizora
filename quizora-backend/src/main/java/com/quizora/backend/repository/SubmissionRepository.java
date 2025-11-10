package com.quizora.backend.repository;

import com.quizora.backend.model.Submission;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SubmissionRepository extends JpaRepository<Submission, Long> {
    List<Submission> findByQuizId(Long quizId);
    Optional<Submission> findByQuizIdAndParticipantName(Long quizId, String participantName);
}
